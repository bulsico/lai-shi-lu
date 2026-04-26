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

const SPOT_PAIR_NAMES: Record<string, string> = {
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

function resolveSpotName(coin: string): string {
  if (coin.startsWith("@")) {
    const num = coin.slice(1);
    return (SPOT_PAIR_NAMES[num] ?? coin) + " spot";
  }
  return coin;
}

function getFeeUsd(fill: RawFill): number {
  const fee = parseFloat(fill.fee || "0");
  const feeToken = fill.feeToken || "USDC";
  if (STABLECOINS.has(feeToken)) return fee;
  return fee * parseFloat(fill.px || "0");
}

async function hlPost(body: object): Promise<RawFill[]> {
  const res = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HL API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchHLFills(address: string): Promise<{
  fills: HLFill[];
  truncated: boolean;
}> {
  const allRaw: RawFill[] = [];

  // Page 1
  const page1 = await hlPost({ type: "userFills", user: address, aggregateByTime: true });
  allRaw.push(...page1);

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
    coin: resolveSpotName(f.coin),
    price: parseFloat(f.px),
    size: parseFloat(f.sz),
    side: f.side,
    dir: f.dir,
    time: f.time,
    date: new Date(f.time).toISOString().split("T")[0],
    closedPnl: parseFloat(f.closedPnl),
    feeUsd: getFeeUsd(f),
    isLiquidation: !!f.liquidation,
    isAirdrop: f.coin === "@107",
    tid: f.tid,
  }));

  return { fills, truncated };
}

// CLI entry
const isMain =
  process.argv[1]?.endsWith("fetch-hl.ts") ||
  process.argv[1]?.endsWith("fetch-hl.js");

if (isMain) {
  const address = process.argv[2];
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

  if (!address || !address.startsWith("0x")) {
    console.error("Usage: tsx scripts/fetch-hl.ts 0x... [--out path/to/fills.json]");
    process.exit(1);
  }

  console.error(`Fetching fills for ${address}...`);
  fetchHLFills(address)
    .then(({ fills, truncated }) => {
      if (truncated) {
        console.error(
          `⚠️  Warning: ${fills.length} fills returned — HL API cap (~10k) may be reached. Older fills are not available.`
        );
      } else {
        console.error(`✓ ${fills.length} fills fetched`);
      }

      const json = JSON.stringify({ fills, truncated }, null, 2);

      if (outPath) {
        const fs = require("fs") as typeof import("fs");
        fs.writeFileSync(outPath, json);
        console.error(`✓ Written to ${outPath}`);
      } else {
        console.log(json);
      }
    })
    .catch((e) => {
      console.error("Error:", e.message);
      process.exit(1);
    });
}
