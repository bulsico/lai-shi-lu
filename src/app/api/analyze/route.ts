import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import {
  logPathFor,
  writeState,
  readState,
  isRunning,
  ensureStateDir,
} from "@/lib/claude-sessions";
import { fetchHLFills, fetchOpenPositions } from "@/lib/fetch-hl";
import { computeStats } from "@/lib/analyze";
import { parseUsageFromLog } from "@/lib/parse-usage";

const PROJECT_CWD = process.cwd();
const CLAUDE_BIN = "/home/exedev/.local/bin/claude";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Abuse guard thresholds — below these, no point running Claude
const MIN_FILLS = 10;
const MIN_DAYS = 3;
// Max concurrent Claude processes to avoid overloading the VPS
const MAX_CONCURRENT = 3;

// In-memory count of active claude processes (resets on server restart, fine for single-instance)
let activeClaude = 0;

export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address || typeof address !== "string" || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return Response.json(
      { error: "请输入有效的 Hyperliquid 地址（0x 开头，42位十六进制）" },
      { status: 400 }
    );
  }

  const normalizedAddress = address.toLowerCase();

  // ── 1. Cache check ────────────────────────────────────────────────────────
  const cached = await prisma.report.findUnique({ where: { address: normalizedAddress } });
  if (cached && cached.markdown && Date.now() - cached.generatedAt.getTime() < ONE_DAY_MS) {
    return Response.json({ status: "done", address: normalizedAddress, cached: true });
  }

  // ── 2. Dedup: is a job already running for this address? ─────────────────
  const runningJob = await prisma.job.findFirst({
    where: { address: normalizedAddress, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (runningJob) {
    // Treat as in-progress if the process is alive OR the job was just created
    // (covers the window before the Claude process starts and writes its session state)
    const age = Date.now() - runningJob.createdAt.getTime();
    if (age < 30_000 || isRunning(runningJob.id)) {
      return Response.json({ status: "generating", sessionId: runningJob.id });
    }
  }

  // ── 3. Reserve a session ID and create the job row immediately ────────────
  // This closes the race window: concurrent requests hitting step 2 will find
  // this pending row and be turned away before we waste time fetching fills.
  ensureStateDir();
  const tmpDir = path.join(PROJECT_CWD, "data/tmp");
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(path.join(PROJECT_CWD, "data/reports"), { recursive: true });

  const sessionId = randomUUID();
  await prisma.job.create({ data: { id: sessionId, address: normalizedAddress, status: "pending" } });

  // ── 4. Fetch fills + compute stats (fast, ~2–5s) ─────────────────────────
  let summary;
  let openPositions;
  try {
    const [{ fills, truncated }, positions] = await Promise.all([
      fetchHLFills(normalizedAddress),
      fetchOpenPositions(normalizedAddress),
    ]);
    summary = computeStats(fills, normalizedAddress, truncated);
    openPositions = positions;
  } catch (e: unknown) {
    await prisma.job.delete({ where: { id: sessionId } });
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `无法获取交易数据：${msg}` }, { status: 502 });
  }

  // ── 5. Abuse guard ────────────────────────────────────────────────────────
  const rejectEarly = async (body: object, status: number) => {
    await prisma.job.delete({ where: { id: sessionId } });
    return Response.json(body, { status });
  };

  if (summary.totalFills === 0) {
    return rejectEarly(
      { error: "这个地址没有任何成交记录。请确认地址是否正确，或者该地址是否曾经在 Hyperliquid 上交易过。" },
      422
    );
  }
  if (summary.totalFills < MIN_FILLS) {
    return rejectEarly(
      {
        error: `这个地址只有 ${summary.totalFills} 笔成交记录，太少了。至少需要 ${MIN_FILLS} 笔成交才能生成有意义的分析报告。`,
        fills: summary.totalFills,
      },
      422
    );
  }
  if (summary.period.days < MIN_DAYS) {
    return rejectEarly(
      {
        error: `这个地址的成交历史只有 ${summary.period.days} 天，太短了。至少需要 ${MIN_DAYS} 天的记录才能分析交易模式。`,
        days: summary.period.days,
      },
      422
    );
  }

  // ── 6. Concurrency cap ────────────────────────────────────────────────────
  if (activeClaude >= MAX_CONCURRENT) {
    return rejectEarly({ error: "服务器当前分析任务较多，请稍等几分钟再试。" }, 429);
  }

  // ── 6. Upsert stats to DB ─────────────────────────────────────────────────
  await prisma.report.upsert({
    where: { address: normalizedAddress },
    create: {
      address: normalizedAddress,
      markdown: "",
      archetype: summary.primaryArchetype,
      archetypeLabel: summary.archetypeLabel,
      grade: summary.grade,
      netPnl: summary.netPnl,
      winRate: summary.winRate,
      totalFills: summary.totalFills,
      uniqueAssets: summary.uniqueAssets,
    },
    update: {
      archetype: summary.primaryArchetype,
      archetypeLabel: summary.archetypeLabel,
      grade: summary.grade,
      netPnl: summary.netPnl,
      winRate: summary.winRate,
      totalFills: summary.totalFills,
      uniqueAssets: summary.uniqueAssets,
    },
  });

  // Write summary JSON for the skill to read
  const summaryPath = path.join(tmpDir, `${normalizedAddress}-summary.json`);
  writeFileSync(summaryPath, JSON.stringify({ ...summary, openPositions }, null, 2));

  // ── 8. Spawn Claude ───────────────────────────────────────────────────────
  const logPath = logPathFor(sessionId);
  const reportPath = path.join(PROJECT_CWD, "data/reports", `${normalizedAddress}.md`);

  const prompt = `/trade-roast ${normalizedAddress}`;
  const args = [
    "-p",
    "--model", "sonnet",
    "--effort", "high",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--dangerously-skip-permissions",
    "--session-id", sessionId,
    prompt,
  ];

  const logFd = openSync(logPath, "w");
  const errFd = openSync(logPath + ".err", "w");

  const claude = spawn(CLAUDE_BIN, args, {
    cwd: PROJECT_CWD,
    env: { ...process.env, HOME: "/home/exedev" },
    stdio: ["ignore", logFd, errFd],
    detached: true,
  });

  closeSync(logFd);
  closeSync(errFd);
  claude.unref();

  const pid = claude.pid!;
  activeClaude++;
  writeState(sessionId, { pid, startedAt: Date.now(), address: normalizedAddress });

  claude.on("close", async (code) => {
    activeClaude = Math.max(0, activeClaude - 1);
    try {
      const state = readState(sessionId);
      writeState(sessionId, {
        ...(state ?? { pid, startedAt: Date.now(), address: normalizedAddress }),
        finishedAt: Date.now(),
        exitCode: code ?? undefined,
      });

      // Read the generated report file (skill writes here)
      let markdown = "";
      if (existsSync(reportPath)) {
        markdown = readFileSync(reportPath, "utf-8");
      }

      const status = markdown.length > 100 ? "done" : (code === 0 ? "done" : "error");

      await prisma.job.update({
        where: { id: sessionId },
        data: { status, error: code !== 0 && !markdown ? `Exit code ${code}` : undefined },
      });

      if (markdown.length > 100) {
        const usage = parseUsageFromLog(logPath);
        await prisma.report.update({
          where: { address: normalizedAddress },
          data: {
            markdown,
            generatedAt: new Date(),
            ...(usage && {
              costUsd: usage.costUsd,
              inputTokens: usage.inputTokens + usage.cacheCreateTokens + usage.cacheReadTokens,
              outputTokens: usage.outputTokens,
            }),
          },
        });
      }
    } catch (err) {
      console.error(`[session ${sessionId}] close handler error:`, err);
    }
  });

  return Response.json({ status: "generating", sessionId });
}
