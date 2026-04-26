/**
 * Compute trade statistics from HL fills.
 *
 * Usage (CLI):
 *   tsx scripts/analyze.ts --fills data/tmp/fills.json [--out data/tmp/summary.json]
 *
 * As a module:
 *   import { computeStats } from './scripts/analyze'
 */

import type { HLFill } from "./fetch-hl";

export interface AssetStat {
  asset: string;
  netPnl: number;
  fills: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  biggestWin: number;
  biggestLoss: number;
  fees: number;
}

export interface MonthStat {
  month: string;
  netPnl: number;
  fills: number;
  cumulative: number;
}

export interface TradeStat {
  coin: string;
  dir: string;
  pnl: number;
  date: string;
  price: number;
  size: number;
}

export interface ArchetypeScores {
  overtrade: number;
  knifeCatcher: number;
  scatterGun: number;
  trendMaster: number;
  panicTrader: number;
  diamondHands: number;
}

export interface Ratings {
  patience: number;      // 0–10
  fomoResistance: number;
  stopLossDiscipline: number;
  trendAwareness: number;
  resilience: number;
}

export interface TradeSummary {
  address: string;
  period: { from: string; to: string; days: number };
  totalFills: number;
  uniqueAssets: number;
  totalRealizedPnl: number;
  totalFees: number;
  netPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  liquidations: number;
  avgFillsPerDay: number;
  peakFillsInOneDay: number;
  peakFillsDate: string;
  truncated: boolean;
  byAsset: AssetStat[];
  byMonth: MonthStat[];
  worstTrades: TradeStat[];
  bestTrades: TradeStat[];
  primaryArchetype: string;
  archetypeLabel: string;
  modifiers: string[];
  archetypeScores: ArchetypeScores;
  ratings: Ratings;
  grade: string;
  gradeLabel: string;
}

function daysBetween(from: string, to: string): number {
  return Math.max(
    1,
    Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

export function computeStats(
  fills: HLFill[],
  address: string,
  truncated = false
): TradeSummary {
  if (fills.length === 0) {
    return emptyStats(address);
  }

  const from = fills[0].date;
  const to = fills[fills.length - 1].date;
  const days = daysBetween(from, to);

  const totalFills = fills.length;
  const totalRealizedPnl = fills.reduce((s, f) => s + f.closedPnl, 0);
  const totalFees = fills.reduce((s, f) => s + f.feeUsd, 0);
  const netPnl = totalRealizedPnl - totalFees;
  const liquidations = fills.filter((f) => f.isLiquidation).length;

  // Closed P&L fills only (exclude 0 closedPnl = opening trades)
  const closedFills = fills.filter((f) => Math.abs(f.closedPnl) > 0.001);
  const wins = closedFills.filter((f) => f.closedPnl > 0);
  const losses = closedFills.filter((f) => f.closedPnl <= 0);
  const winRate =
    closedFills.length > 0 ? wins.length / closedFills.length : 0;
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, f) => s + f.closedPnl, 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? losses.reduce((s, f) => s + f.closedPnl, 0) / losses.length
      : 0;

  // Fills per day
  const avgFillsPerDay = totalFills / days;
  const fillsByDate: Record<string, number> = {};
  for (const f of fills) {
    fillsByDate[f.date] = (fillsByDate[f.date] ?? 0) + 1;
  }
  let peakFillsInOneDay = 0;
  let peakFillsDate = from;
  for (const [date, count] of Object.entries(fillsByDate)) {
    if (count > peakFillsInOneDay) {
      peakFillsInOneDay = count;
      peakFillsDate = date;
    }
  }

  // Unique assets (excluding spot names for simplicity)
  const uniqueAssets = new Set(fills.map((f) => f.coin)).size;

  // By asset
  const assetMap: Record<string, { pnls: number[]; fees: number; fills: number }> = {};
  for (const f of fills) {
    if (!assetMap[f.coin]) assetMap[f.coin] = { pnls: [], fees: 0, fills: 0 };
    assetMap[f.coin].fills++;
    assetMap[f.coin].fees += f.feeUsd;
    if (Math.abs(f.closedPnl) > 0.001) {
      assetMap[f.coin].pnls.push(f.closedPnl);
    }
  }
  const byAsset: AssetStat[] = Object.entries(assetMap)
    .map(([asset, { pnls, fees, fills: fillCount }]) => {
      const assetWins = pnls.filter((p) => p > 0);
      const assetLosses = pnls.filter((p) => p <= 0);
      const assetNetPnl =
        pnls.reduce((s, p) => s + p, 0) - fees;
      return {
        asset,
        netPnl: assetNetPnl,
        fills: fillCount,
        wins: assetWins.length,
        losses: assetLosses.length,
        winRate:
          pnls.length > 0 ? assetWins.length / pnls.length : 0,
        avgWin:
          assetWins.length > 0
            ? assetWins.reduce((s, p) => s + p, 0) / assetWins.length
            : 0,
        avgLoss:
          assetLosses.length > 0
            ? assetLosses.reduce((s, p) => s + p, 0) / assetLosses.length
            : 0,
        biggestWin: assetWins.length > 0 ? Math.max(...assetWins) : 0,
        biggestLoss: assetLosses.length > 0 ? Math.min(...assetLosses) : 0,
        fees,
      };
    })
    .sort((a, b) => a.netPnl - b.netPnl);

  // By month
  const monthMap: Record<string, { pnl: number; fills: number }> = {};
  for (const f of fills) {
    const month = f.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { pnl: 0, fills: 0 };
    monthMap[month].pnl += f.closedPnl - f.feeUsd;
    monthMap[month].fills++;
  }
  let cumulative = 0;
  const byMonth: MonthStat[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { pnl, fills: mFills }]) => {
      cumulative += pnl;
      return { month, netPnl: pnl, fills: mFills, cumulative };
    });

  // Worst/best trades
  const sortedByPnl = [...closedFills].sort((a, b) => a.closedPnl - b.closedPnl);
  const toTradeStat = (f: HLFill): TradeStat => ({
    coin: f.coin,
    dir: f.dir,
    pnl: f.closedPnl,
    date: f.date,
    price: f.price,
    size: f.size,
  });
  const worstTrades = sortedByPnl.slice(0, 5).map(toTradeStat);
  const bestTrades = sortedByPnl.slice(-5).reverse().map(toTradeStat);

  // Archetype scoring
  const archetypeScores = scoreArchetypes({
    avgFillsPerDay,
    peakFillsInOneDay,
    winRate,
    avgWin,
    avgLoss: Math.abs(avgLoss),
    uniqueAssets,
    totalFills,
    liquidations,
    byMonth,
    byAsset,
  });

  const { primaryArchetype, archetypeLabel, modifiers } =
    selectArchetype(archetypeScores, winRate, netPnl, avgWin, Math.abs(avgLoss));

  const ratings = deriveRatings(archetypeScores, winRate, avgWin, Math.abs(avgLoss));
  const { grade, gradeLabel } = deriveGrade(winRate, netPnl, liquidations, totalFills);

  return {
    address,
    period: { from, to, days },
    totalFills,
    uniqueAssets,
    totalRealizedPnl,
    totalFees,
    netPnl,
    winRate,
    avgWin,
    avgLoss,
    liquidations,
    avgFillsPerDay,
    peakFillsInOneDay,
    peakFillsDate,
    truncated,
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

function scoreArchetypes(params: {
  avgFillsPerDay: number;
  peakFillsInOneDay: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  uniqueAssets: number;
  totalFills: number;
  liquidations: number;
  byMonth: MonthStat[];
  byAsset: AssetStat[];
}): ArchetypeScores {
  const { avgFillsPerDay, peakFillsInOneDay, winRate, avgWin, avgLoss,
    uniqueAssets, totalFills, liquidations, byMonth, byAsset } = params;

  // OVERTRADE: fills per day as primary signal
  const overtrade = Math.min(100, avgFillsPerDay * 5);

  // KNIFE_CATCHER: avg loss much bigger than avg win
  const lossWinRatio = avgWin > 0 ? avgLoss / avgWin : 5;
  const knifeCatcher = Math.min(100, lossWinRatio * 25);

  // SCATTER_GUN: many unique assets, no concentration
  const topAssetFills = byAsset.length > 0
    ? Math.max(...byAsset.map((a) => a.fills))
    : 0;
  const concentration = totalFills > 0 ? topAssetFills / totalFills : 1;
  const scatterGun = Math.min(100, (uniqueAssets / 10) * 50 * (1 - concentration));

  // TREND_MASTER: high win rate + avg win > avg loss
  const trendMaster = winRate > 0.5 && avgWin > avgLoss
    ? Math.min(100, (winRate - 0.4) * 200 + (avgWin / (avgLoss || 1)) * 10)
    : Math.max(0, winRate * 50);

  // PANIC_TRADER: liquidations + fill-count volatility across months
  const liquidationRate = totalFills > 0 ? liquidations / totalFills : 0;
  const fillCounts = byMonth.map((m) => m.fills);
  const fillVolatility = fillCounts.length > 1
    ? stdDev(fillCounts) / (average(fillCounts) || 1)
    : 0;
  const panicTrader = Math.min(100, liquidationRate * 500 + fillVolatility * 30);

  // DIAMOND_HANDS: few trades per day + low unique assets
  const diamondHands = Math.max(
    0,
    Math.min(100, (1 - avgFillsPerDay / 5) * 50 + (1 - uniqueAssets / 30) * 50)
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
  // Positive types first
  if (scores.trendMaster >= 65 && netPnl > 0) {
    return { primaryArchetype: "TREND_MASTER", archetypeLabel: "右侧交易大师", modifiers: [] };
  }

  // Pick highest-scoring negative type
  const candidates: [string, string, number][] = [
    ["OVERTRADE", "过度交易内耗型", scores.overtrade],
    ["KNIFE_CATCHER", "左侧接刀殉道者", scores.knifeCatcher],
    ["SCATTER_GUN", "机枪扫射型", scores.scatterGun],
    ["PANIC_TRADER", "情绪化清仓机", scores.panicTrader],
    ["DIAMOND_HANDS", "钻石手候鸟", scores.diamondHands],
  ];

  candidates.sort((a, b) => b[2] - a[2]);
  const [primaryArchetype, archetypeLabel] = candidates[0];

  // Modifiers (secondary traits)
  const modifiers: string[] = [];
  if (avgAbsLoss > avgWin * 2.5) modifiers.push("·止损恐惧症");
  if (scores.overtrade > 50 && primaryArchetype !== "OVERTRADE")
    modifiers.push("·补仓上瘾");
  if (winRate > 0.5 && netPnl < 0) modifiers.push("·右侧觉醒中");

  return { primaryArchetype, archetypeLabel, modifiers };
}

function deriveRatings(
  scores: ArchetypeScores,
  winRate: number,
  avgWin: number,
  avgAbsLoss: number
): Ratings {
  const patience = Math.round(Math.max(0, 10 - scores.overtrade / 12));
  const fomoResistance = Math.round(
    Math.max(0, 10 - (scores.overtrade + scores.panicTrader) / 20)
  );
  const stopLossDiscipline = Math.round(
    Math.max(0, 10 - scores.knifeCatcher / 12)
  );
  const trendAwareness = Math.round(
    Math.min(10, winRate * 10 + (avgWin > avgAbsLoss ? 2 : 0))
  );
  const resilience = Math.round(
    Math.min(10, winRate * 8 + (scores.trendMaster > 50 ? 2 : 0))
  );
  return { patience, fomoResistance, stopLossDiscipline, trendAwareness, resilience };
}

function deriveGrade(
  winRate: number,
  netPnl: number,
  liquidations: number,
  totalFills: number
): { grade: string; gradeLabel: string } {
  const liqRate = totalFills > 0 ? liquidations / totalFills : 0;

  if (winRate >= 0.55 && netPnl > 0 && liqRate < 0.01)
    return { grade: "S", gradeLabel: "传奇交易员" };
  if (winRate >= 0.50 && netPnl > -500 && liqRate < 0.02)
    return { grade: "A", gradeLabel: "稳健老手" };
  if (winRate >= 0.45 || netPnl > 0)
    return { grade: "B", gradeLabel: "有潜力新人" };
  if (winRate >= 0.40)
    return { grade: "C", gradeLabel: "有潜力的反向指标" };
  if (winRate >= 0.35 || liqRate < 0.05)
    return { grade: "D", gradeLabel: "纯韭菜" };
  return { grade: "F", gradeLabel: "建议认真考虑人生方向" };
}

function emptyStats(address: string): TradeSummary {
  return {
    address,
    period: { from: "", to: "", days: 0 },
    totalFills: 0,
    uniqueAssets: 0,
    totalRealizedPnl: 0,
    totalFees: 0,
    netPnl: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    liquidations: 0,
    avgFillsPerDay: 0,
    peakFillsInOneDay: 0,
    peakFillsDate: "",
    truncated: false,
    byAsset: [],
    byMonth: [],
    worstTrades: [],
    bestTrades: [],
    primaryArchetype: "UNKNOWN",
    archetypeLabel: "神秘交易员",
    modifiers: [],
    archetypeScores: { overtrade: 0, knifeCatcher: 0, scatterGun: 0, trendMaster: 0, panicTrader: 0, diamondHands: 0 },
    ratings: { patience: 5, fomoResistance: 5, stopLossDiscipline: 5, trendAwareness: 5, resilience: 5 },
    grade: "?",
    gradeLabel: "数据不足",
  };
}

function average(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = average(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
}

// CLI entry
const isMain =
  process.argv[1]?.endsWith("analyze.ts") ||
  process.argv[1]?.endsWith("analyze.js");

if (isMain) {
  const fillsIdx = process.argv.indexOf("--fills");
  const outIdx = process.argv.indexOf("--out");
  const fillsPath = fillsIdx !== -1 ? process.argv[fillsIdx + 1] : null;
  const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

  if (!fillsPath) {
    console.error("Usage: tsx scripts/analyze.ts --fills path/to/fills.json [--out path/to/summary.json]");
    process.exit(1);
  }

  const fs = require("fs") as typeof import("fs");
  const raw = JSON.parse(fs.readFileSync(fillsPath, "utf-8")) as {
    fills: HLFill[];
    truncated: boolean;
    address?: string;
  };

  const address = raw.address ?? "unknown";
  const summary = computeStats(raw.fills, address, raw.truncated);
  const json = JSON.stringify(summary, null, 2);

  if (outPath) {
    fs.writeFileSync(outPath, json);
    console.error(`✓ Summary written to ${outPath}`);
    console.error(`  ${summary.totalFills} fills · ${summary.uniqueAssets} assets · net P&L $${summary.netPnl.toFixed(0)} · ${summary.grade} grade · ${summary.archetypeLabel}`);
  } else {
    console.log(json);
  }
}
