/**
 * Fetch all Hyperliquid fills for a given address.
 *
 * Usage (CLI):
 *   tsx scripts/fetch-hl.ts 0x123...
 *   tsx scripts/fetch-hl.ts 0x123... --out data/tmp/fills.json
 *
 * As a module:
 *   import { fetchHLFills } from './scripts/fetch-hl'
 */

const HL_API = "https://api.hyperliquid.xyz/info";

// HL API has a hard cap of ~10k fills per address.
// Heavy traders with >10k fills will get incomplete history — we note this in the report.
const MAX_FILLS_WARNING = 9500;

// Fallback static map — used if spotMeta fetch fails
const SPOT_PAIR_NAMES_FALLBACK: Record<string, string> = {
  "107": "HYPE/USDC",
  "188": "UPUMP/USDC",
  "150": "USDE/USDC",
  "74": "OMNIX/USDC",
  "182": "XAUT0/USDC",
  "210": "UXPL/USDC",
  "228": "UDZ/USDC",
  "230": "USDH/USDC",
  "1": "HFUN/USDC",
  "4": "JEFF/USDC",
  "8": "POINTS/USDC",
  "166": "USDT0/USDC",
  "305": "HWHLP/USDC",
};

async function fetchSpotNames(): Promise<Record<string, string>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotMeta" }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return SPOT_PAIR_NAMES_FALLBACK;
    const data = await res.json();
    const map: Record<string, string> = { ...SPOT_PAIR_NAMES_FALLBACK };
    for (const token of data.tokens ?? []) {
      if (token.index !== undefined && token.name) {
        map[String(token.index)] = `${token.name}/USDC`;
      }
    }
    return map;
  } catch {
    return SPOT_PAIR_NAMES_FALLBACK;
  }
}

const STABLECOINS = new Set(["USDC", "USDE", "USDH"]);

export interface HLFill {
  coin: string;
  price: number;
  size: number;
  side: string;
  dir: string;
  time: number;
  date: string;
  closedPnl: number;
  feeUsd: number;
  isLiquidation: boolean;
  isAirdrop: boolean;
  tid: number;
}

interface RawFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  dir: string;
  time: number;
  closedPnl: string;
  fee: string;
  feeToken?: string;
  tid: number;
  liquidation?: { liquidatedUser: string };
}

function resolveSpotName(coin: string, names: Record<string, string>): string {
  if (coin.startsWith("@")) {
    const num = coin.slice(1);
    return (names[num] ?? coin) + " spot";
  }
  return coin;
}

function getFeeUsd(fill: RawFill): number {
  const fee = safeFloat(fill.fee || "0");
  const feeToken = fill.feeToken || "USDC";
  if (STABLECOINS.has(feeToken)) return fee;
  return fee * safeFloat(fill.px || "0");
}

function safeFloat(s: string, fallback = 0): number {
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

async function hlPost(body: object): Promise<RawFill[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HL API error ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHLFills(address: string): Promise<{
  fills: HLFill[];
  truncated: boolean;
}> {
  const [page1, spotNames] = await Promise.all([
    hlPost({ type: "userFills", user: address, aggregateByTime: true }),
    fetchSpotNames(),
  ]);

  const allRaw: RawFill[] = [...page1];

  // Paginate while page size == 2000 (more pages exist)
  let lastPage = page1;
  let pageNum = 1;
  while (lastPage.length === 2000) {
    pageNum++;
    const lastTime = lastPage[lastPage.length - 1].time;
    const page = await hlPost({
      type: "userFillsByTime",
      user: address,
      startTime: 0,
      endTime: lastTime,
      aggregateByTime: true,
    });
    allRaw.push(...page);
    lastPage = page;
    if (pageNum > 10) break; // safety cap
  }

  const truncated = allRaw.length >= MAX_FILLS_WARNING;

  // Deduplicate by tid
  const seen = new Set<number>();
  const deduped = allRaw.filter((f) => {
    if (seen.has(f.tid)) return false;
    seen.add(f.tid);
    return true;
  });

  // Sort chronologically
  deduped.sort((a, b) => a.time - b.time);

  const fills: HLFill[] = deduped.map((f) => ({
    coin: resolveSpotName(f.coin, spotNames),
    price: safeFloat(f.px),
    size: safeFloat(f.sz),
    side: f.side,
    dir: f.dir,
    time: f.time,
    date: new Date(f.time).toISOString().split("T")[0],
    closedPnl: safeFloat(f.closedPnl),
    feeUsd: getFeeUsd(f),
    isLiquidation: !!f.liquidation,
    isAirdrop: f.coin === "@107",
    tid: f.tid,
  }));

  return { fills, truncated };
}

export interface OpenPosition {
  coin: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  liquidationPx: number | null;
  leverage: number;
}

export async function fetchOpenPositions(address: string): Promise<OpenPosition[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const positions: OpenPosition[] = [];
    for (const ap of data.assetPositions ?? []) {
      const p = ap.position;
      const szi = safeFloat(p.szi ?? "0");
      if (szi === 0) continue;
      positions.push({
        coin: p.coin,
        side: szi > 0 ? "long" : "short",
        size: Math.abs(szi),
        entryPrice: safeFloat(p.entryPx ?? "0"),
        positionValue: safeFloat(p.positionValue ?? "0"),
        unrealizedPnl: safeFloat(p.unrealizedPnl ?? "0"),
        liquidationPx: p.liquidationPx ? safeFloat(p.liquidationPx) : null,
        leverage: p.leverage?.value ?? 1,
      });
    }
    return positions;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
