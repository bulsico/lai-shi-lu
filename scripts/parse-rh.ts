/**
 * Parse Robinhood activity CSV into TradeSummary.
 *
 * Usage (CLI):
 *   tsx scripts/parse-rh.ts path/to/activity.csv [--out data/tmp/rh-summary.json]
 *
 * Robinhood CSV columns (standard stock/options format):
 *   Activity Date, Instrument, Description, Trans Code, Quantity, Price, Amount
 *
 * Robinhood CSV columns (crypto order export format — auto-detected):
 *   UUID, Time Entered, Symbol, Side, Quantity, State, Order Type,
 *   Leaves Quantity, Entered Price, Average Price, Notional
 *   Only Filled rows are imported; Average Price is used as fill price.
 *
 * Trans codes handled (standard format):
 *   Buy / BTO → open long
 *   Sell / STC → close long
 *   STO → open short
 *   BTC → close short
 *   OEXP → option expiration at $0 (loss = full premium paid)
 *   Everything else (Div, JNLC, ACH, etc.) → skipped
 */

import fs from "fs";
import path from "path";
import type {
  TradeSummary,
  AssetStat,
  MonthStat,
  TradeStat,
  ArchetypeScores,
  Ratings,
} from "./analyze";

// ── CSV parsing ───────────────────────────────────────────────────────────────

interface RHRow {
  date: string;       // YYYY-MM-DD
  instrument: string;
  transCode: string;
  qty: number;
  price: number;
  amount: number;     // total USD value of the transaction (handles options 100× multiplier)
}

function splitLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function normalizeDate(raw: string): string | null {
  // YYYY-MM-DD passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[$, ]/g, "")) || 0;
}

// Robinhood crypto order export: UUID, Time Entered, Symbol, Side, Quantity, State, ...Average Price, Notional
function parseCryptoOrderCSV(lines: string[], header: string[]): RHRow[] {
  const col = (name: string): number => header.indexOf(name);
  const timeIdx = col("time entered");
  const symbolIdx = col("symbol");
  const sideIdx = col("side");
  const qtyIdx = col("quantity");
  const stateIdx = col("state");
  const avgPriceIdx = col("average price");
  const notionalIdx = col("notional");

  const rows: RHRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    if ((parts[stateIdx] ?? "").trim().toLowerCase() !== "filled") continue;

    // Time Entered: "MM/DD/YYYY, HH:MM:SS"
    const datePart = (parts[timeIdx] ?? "").split(",")[0].trim();
    const date = normalizeDate(datePart);
    if (!date) continue;

    const instrument = (parts[symbolIdx] ?? "").toUpperCase();
    const rawSide = (parts[sideIdx] ?? "").toUpperCase();
    const transCode = rawSide === "BUY" ? "BUY" : rawSide === "SELL" ? "SELL" : "";
    if (!transCode || !instrument) continue;

    const qty = Math.abs(parseNum(parts[qtyIdx] ?? ""));
    const price = Math.abs(parseNum(parts[avgPriceIdx] ?? ""));
    if (qty === 0) continue;

    const notional = notionalIdx >= 0 ? Math.abs(parseNum(parts[notionalIdx] ?? "")) : 0;
    const amount = notional || price * qty;

    rows.push({ date, instrument, transCode, qty, price, amount });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function parseRHCSV(content: string): RHRow[] {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());

  // Auto-detect Robinhood crypto order export format
  if (header.includes("time entered") && header.includes("average price")) {
    return parseCryptoOrderCSV(lines, header);
  }

  const col = (name: string, ...aliases: string[]): number => {
    for (const n of [name, ...aliases]) {
      const idx = header.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateIdx = col("activity date", "date");
  const instrIdx = col("instrument", "symbol");
  const codeIdx = col("trans code", "type", "side");
  const qtyIdx = col("quantity", "qty");
  const priceIdx = col("price");
  const amountIdx = col("amount");

  if (dateIdx < 0 || instrIdx < 0 || codeIdx < 0 || qtyIdx < 0) {
    throw new Error(
      "CSV missing required columns. Expected: Activity Date, Instrument, Trans Code, Quantity, Price"
    );
  }

  const rows: RHRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const rawDate = parts[dateIdx] ?? "";
    const instrument = (parts[instrIdx] ?? "").toUpperCase();
    const transCode = (parts[codeIdx] ?? "").toUpperCase().replace(/\s+/g, "");
    const qty = Math.abs(parseNum(parts[qtyIdx] ?? ""));
    const price = priceIdx >= 0 ? Math.abs(parseNum(parts[priceIdx] ?? "")) : 0;
    const amount = amountIdx >= 0 ? Math.abs(parseNum(parts[amountIdx] ?? "")) : price * qty;

    if (!instrument || !transCode || qty === 0) continue;
    const date = normalizeDate(rawDate);
    if (!date) continue;

    rows.push({ date, instrument, transCode, qty, price, amount });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// ── FIFO P&L ─────────────────────────────────────────────────────────────────

interface Lot { price: number; qty: number; date: string }

interface ClosedTrade {
  coin: string;
  dir: "LONG" | "SHORT";
  pnl: number;
  date: string;
  price: number;
  size: number;
}

const BUY_CODES = new Set(["BUY", "BTO"]);
const SELL_CODES = new Set(["SELL", "STC"]);
const SHORT_OPEN_CODES = new Set(["STO"]);
const SHORT_CLOSE_CODES = new Set(["BTC"]);
const EXPIRY_CODES = new Set(["OEXP"]);

function runFIFO(rows: RHRow[]): ClosedTrade[] {
  // longs[instrument] = queue of open lots (long)
  const longs: Record<string, Lot[]> = {};
  // shorts[instrument] = queue of open lots (short, price = entry sell price)
  const shorts: Record<string, Lot[]> = {};
  const closed: ClosedTrade[] = [];

  for (const row of rows) {
    const { instrument: coin, transCode, qty, price, amount, date } = row;
    // Use amount/qty as per-unit cost so options (price-per-share × 100 × contracts)
    // and stocks (price × shares) are both handled correctly via the Amount column.
    const unitCost = amount > 0 ? amount / qty : price;

    if (BUY_CODES.has(transCode)) {
      // Open long
      if (!longs[coin]) longs[coin] = [];
      longs[coin].push({ price: unitCost, qty, date });

    } else if (SELL_CODES.has(transCode)) {
      // Close long via FIFO
      if (!longs[coin]) longs[coin] = [];
      let remaining = qty;
      while (remaining > 0 && longs[coin].length > 0) {
        const lot = longs[coin][0];
        const filled = Math.min(remaining, lot.qty);
        const pnl = (unitCost - lot.price) * filled;
        closed.push({ coin, dir: "LONG", pnl, date, price, size: filled });
        lot.qty -= filled;
        remaining -= filled;
        if (lot.qty < 1e-9) longs[coin].shift();
      }
      // If still remaining and no lots, treat as closing a short (RH sometimes omits open)
      if (remaining > 0) {
        closed.push({ coin, dir: "LONG", pnl: 0, date, price, size: remaining });
      }

    } else if (SHORT_OPEN_CODES.has(transCode)) {
      // Open short (sell to open)
      if (!shorts[coin]) shorts[coin] = [];
      shorts[coin].push({ price: unitCost, qty, date });

    } else if (SHORT_CLOSE_CODES.has(transCode)) {
      // Close short (buy to close)
      if (!shorts[coin]) shorts[coin] = [];
      let remaining = qty;
      while (remaining > 0 && shorts[coin].length > 0) {
        const lot = shorts[coin][0];
        const filled = Math.min(remaining, lot.qty);
        const pnl = (lot.price - unitCost) * filled; // short profit = entry - exit
        closed.push({ coin, dir: "SHORT", pnl, date, price, size: filled });
        lot.qty -= filled;
        remaining -= filled;
        if (lot.qty < 1e-9) shorts[coin].shift();
      }

    } else if (EXPIRY_CODES.has(transCode)) {
      // Option expired worthless — full premium loss
      const lots = longs[coin] ?? [];
      for (const lot of lots) {
        closed.push({ coin, dir: "LONG", pnl: -lot.price * lot.qty, date, price: 0, size: lot.qty });
      }
      longs[coin] = [];
    }
    // All other codes (Div, JNLC, ACH, GOLD, etc.) skipped
  }

  return closed;
}

// ── Stats computation ─────────────────────────────────────────────────────────

function daysBetween(from: string, to: string): number {
  return Math.max(
    1,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
  );
}

function average(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = average(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
}

function scoreArchetypes(params: {
  avgFillsPerDay: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  uniqueAssets: number;
  totalFills: number;
  byMonth: MonthStat[];
  byAsset: AssetStat[];
}): ArchetypeScores {
  const { avgFillsPerDay, winRate, avgWin, avgLoss,
    uniqueAssets, totalFills, byMonth, byAsset } = params;

  const overtrade = Math.min(100, avgFillsPerDay * 10); // stocks trade less frequently

  const lossWinRatio = avgWin > 0 ? avgLoss / avgWin : 5;
  const knifeCatcher = Math.min(100, lossWinRatio * 25);

  const topAssetFills = byAsset.length > 0 ? Math.max(...byAsset.map((a) => a.fills)) : 0;
  const concentration = totalFills > 0 ? topAssetFills / totalFills : 1;
  const scatterGun = Math.min(100, (uniqueAssets / 10) * 50 * (1 - concentration));

  const trendMaster = winRate > 0.5 && avgWin > avgLoss
    ? Math.min(100, (winRate - 0.4) * 200 + (avgWin / (avgLoss || 1)) * 10)
    : Math.max(0, winRate * 50);

  const fillCounts = byMonth.map((m) => m.fills);
  const fillVolatility = fillCounts.length > 1
    ? stdDev(fillCounts) / (average(fillCounts) || 1)
    : 0;
  const panicTrader = Math.min(100, fillVolatility * 40); // no liquidations in stocks

  const diamondHands = Math.max(
    0,
    Math.min(100, (1 - avgFillsPerDay / 3) * 50 + (1 - uniqueAssets / 20) * 50)
  );

  return {
    overtrade: Math.round(overtrade),
    knifeCatcher: Math.round(knifeCatcher),
    scatterGun: Math.round(scatterGun),
    trendMaster: Math.round(trendMaster),
    panicTrader: Math.round(panicTrader),
    diamondHands: Math.round(diamondHands),
  };
}

function selectArchetype(
  scores: ArchetypeScores,
  winRate: number,
  netPnl: number,
  avgWin: number,
  avgAbsLoss: number
): { primaryArchetype: string; archetypeLabel: string; modifiers: string[] } {
  if (scores.trendMaster >= 65 && netPnl > 0) {
    return { primaryArchetype: "TREND_MASTER", archetypeLabel: "右侧交易大师", modifiers: [] };
  }
  const candidates: [string, string, number][] = [
    ["OVERTRADE", "过度交易内耗型", scores.overtrade],
    ["KNIFE_CATCHER", "左侧接刀殉道者", scores.knifeCatcher],
    ["SCATTER_GUN", "机枪扫射型", scores.scatterGun],
    ["PANIC_TRADER", "情绪化清仓机", scores.panicTrader],
    ["DIAMOND_HANDS", "钻石手候鸟", scores.diamondHands],
  ];
  candidates.sort((a, b) => b[2] - a[2]);
  const [primaryArchetype, archetypeLabel] = candidates[0];

  const modifiers: string[] = [];
  if (avgAbsLoss > avgWin * 2.5) modifiers.push("·止损恐惧症");
  if (scores.overtrade > 50 && primaryArchetype !== "OVERTRADE") modifiers.push("·补仓上瘾");
  if (winRate > 0.5 && netPnl < 0) modifiers.push("·右侧觉醒中");

  return { primaryArchetype, archetypeLabel, modifiers };
}

function deriveRatings(
  scores: ArchetypeScores,
  winRate: number,
  avgWin: number,
  avgAbsLoss: number
): Ratings {
  return {
    patience: Math.round(Math.max(0, 10 - scores.overtrade / 12)),
    fomoResistance: Math.round(Math.max(0, 10 - (scores.overtrade + scores.panicTrader) / 20)),
    stopLossDiscipline: Math.round(Math.max(0, 10 - scores.knifeCatcher / 12)),
    trendAwareness: Math.round(Math.min(10, winRate * 10 + (avgWin > avgAbsLoss ? 2 : 0))),
    resilience: Math.round(Math.min(10, winRate * 8 + (scores.trendMaster > 50 ? 2 : 0))),
  };
}

function deriveGrade(
  winRate: number,
  netPnl: number
): { grade: string; gradeLabel: string } {
  if (winRate >= 0.55 && netPnl > 0)
    return { grade: "S", gradeLabel: "传奇交易员" };
  if (winRate >= 0.50 && netPnl > -500)
    return { grade: "A", gradeLabel: "稳健老手" };
  if (winRate >= 0.45 || netPnl > 0)
    return { grade: "B", gradeLabel: "有潜力新人" };
  if (winRate >= 0.40)
    return { grade: "C", gradeLabel: "有潜力的反向指标" };
  if (winRate >= 0.35)
    return { grade: "D", gradeLabel: "纯韭菜" };
  return { grade: "F", gradeLabel: "建议认真考虑人生方向" };
}

export function computeRHStats(
  closed: ClosedTrade[],
  label: string
): TradeSummary {
  if (closed.length === 0) {
    return emptyStats(label);
  }

  const from = closed.reduce((m, t) => (t.date < m ? t.date : m), closed[0].date);
  const to = closed.reduce((m, t) => (t.date > m ? t.date : m), closed[0].date);
  const days = daysBetween(from, to);

  const totalFills = closed.length;
  const totalRealizedPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const totalFees = 0; // RH is commission-free
  const netPnl = totalRealizedPnl;

  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl <= 0);
  const winRate = totalFills > 0 ? wins.length / totalFills : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

  const avgFillsPerDay = totalFills / days;

  const fillsByDate: Record<string, number> = {};
  for (const t of closed) fillsByDate[t.date] = (fillsByDate[t.date] ?? 0) + 1;
  let peakFillsInOneDay = 0, peakFillsDate = from;
  for (const [d, c] of Object.entries(fillsByDate)) {
    if (c > peakFillsInOneDay) { peakFillsInOneDay = c; peakFillsDate = d; }
  }

  const uniqueAssets = new Set(closed.map((t) => t.coin)).size;

  // By asset
  const assetMap: Record<string, { pnls: number[]; fills: number }> = {};
  for (const t of closed) {
    if (!assetMap[t.coin]) assetMap[t.coin] = { pnls: [], fills: 0 };
    assetMap[t.coin].fills++;
    assetMap[t.coin].pnls.push(t.pnl);
  }
  const byAsset: AssetStat[] = Object.entries(assetMap)
    .map(([asset, { pnls, fills: fillCount }]) => {
      const aw = pnls.filter((p) => p > 0);
      const al = pnls.filter((p) => p <= 0);
      return {
        asset,
        netPnl: pnls.reduce((s, p) => s + p, 0),
        fills: fillCount,
        wins: aw.length,
        losses: al.length,
        winRate: pnls.length > 0 ? aw.length / pnls.length : 0,
        avgWin: aw.length > 0 ? aw.reduce((s, p) => s + p, 0) / aw.length : 0,
        avgLoss: al.length > 0 ? al.reduce((s, p) => s + p, 0) / al.length : 0,
        biggestWin: aw.length > 0 ? Math.max(...aw) : 0,
        biggestLoss: al.length > 0 ? Math.min(...al) : 0,
        fees: 0,
      };
    })
    .sort((a, b) => a.netPnl - b.netPnl);

  // By month
  const monthMap: Record<string, { pnl: number; fills: number }> = {};
  for (const t of closed) {
    const month = t.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { pnl: 0, fills: 0 };
    monthMap[month].pnl += t.pnl;
    monthMap[month].fills++;
  }
  let cumulative = 0;
  const byMonth: MonthStat[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { pnl, fills: mFills }]) => {
      cumulative += pnl;
      return { month, netPnl: pnl, fills: mFills, cumulative };
    });

  // Worst / best trades
  const sorted = [...closed].sort((a, b) => a.pnl - b.pnl);
  const toStat = (t: ClosedTrade): TradeStat => ({
    coin: t.coin, dir: t.dir, pnl: t.pnl, date: t.date, price: t.price, size: t.size,
  });
  const worstTrades = sorted.slice(0, 5).map(toStat);
  const bestTrades = sorted.slice(-5).reverse().map(toStat);

  const archetypeScores = scoreArchetypes({
    avgFillsPerDay, winRate, avgWin, avgLoss: Math.abs(avgLoss),
    uniqueAssets, totalFills, byMonth, byAsset,
  });

  const { primaryArchetype, archetypeLabel, modifiers } =
    selectArchetype(archetypeScores, winRate, netPnl, avgWin, Math.abs(avgLoss));

  const ratings = deriveRatings(archetypeScores, winRate, avgWin, Math.abs(avgLoss));
  const { grade, gradeLabel } = deriveGrade(winRate, netPnl);

  return {
    address: label,
    period: { from, to, days },
    totalFills,
    uniqueAssets,
    totalRealizedPnl,
    totalFees,
    netPnl,
    winRate,
    avgWin,
    avgLoss,
    liquidations: 0,
    avgFillsPerDay,
    peakFillsInOneDay,
    peakFillsDate,
    truncated: false,
    byAsset,
    byMonth,
    worstTrades,
    bestTrades,
    primaryArchetype,
    archetypeLabel,
    modifiers,
    archetypeScores,
    ratings,
    grade,
    gradeLabel,
  };
}

function emptyStats(label: string): TradeSummary {
  return {
    address: label,
    period: { from: "", to: "", days: 0 },
    totalFills: 0, uniqueAssets: 0, totalRealizedPnl: 0, totalFees: 0,
    netPnl: 0, winRate: 0, avgWin: 0, avgLoss: 0, liquidations: 0,
    avgFillsPerDay: 0, peakFillsInOneDay: 0, peakFillsDate: "", truncated: false,
    byAsset: [], byMonth: [], worstTrades: [], bestTrades: [],
    primaryArchetype: "UNKNOWN", archetypeLabel: "神秘交易员", modifiers: [],
    archetypeScores: { overtrade: 0, knifeCatcher: 0, scatterGun: 0, trendMaster: 0, panicTrader: 0, diamondHands: 0 },
    ratings: { patience: 5, fomoResistance: 5, stopLossDiscipline: 5, trendAwareness: 5, resilience: 5 },
    grade: "?", gradeLabel: "数据不足",
  };
}

// ── Multi-file merge ──────────────────────────────────────────────────────────

function mergeAndDedup(csvPaths: string[]): RHRow[] {
  const seen = new Set<string>();
  const all: RHRow[] = [];

  for (const csvPath of csvPaths) {
    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseRHCSV(content);
    let added = 0;
    for (const row of rows) {
      // Dedup key: date + instrument + transCode + qty + price
      // Handles overlapping exports from the same period
      const key = `${row.date}|${row.instrument}|${row.transCode}|${row.qty}|${row.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(row);
        added++;
      }
    }
    console.error(`  ${path.basename(csvPath)}: ${rows.length} rows parsed, ${added} unique`);
  }

  return all.sort((a, b) => a.date.localeCompare(b.date));
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

const isMain =
  process.argv[1]?.endsWith("parse-rh.ts") ||
  process.argv[1]?.endsWith("parse-rh.js");

if (isMain) {
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

  // Collect all positional args (not flags, not the value after --out)
  const csvPaths: string[] = [];
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--out") { i++; continue; }
    if (!arg.startsWith("--")) csvPaths.push(arg);
  }

  if (csvPaths.length === 0) {
    console.error("Usage: tsx scripts/parse-rh.ts file1.csv [file2.csv ...] [--out summary.json]");
    process.exit(1);
  }

  const rows = mergeAndDedup(csvPaths);
  const closed = runFIFO(rows);
  const label = csvPaths.length === 1
    ? path.basename(csvPaths[0], path.extname(csvPaths[0]))
    : "rh-combined";
  const summary = computeRHStats(closed, label);
  const json = JSON.stringify(summary, null, 2);

  if (outPath) {
    fs.writeFileSync(outPath, json);
    console.error(`✓ Summary written to ${outPath}`);
    console.error(
      `  ${summary.totalFills} closed trades · ${summary.uniqueAssets} assets · ` +
      `net P&L $${summary.netPnl.toFixed(0)} · ${summary.grade} grade · ${summary.archetypeLabel}`
    );
  } else {
    console.log(json);
  }
}
