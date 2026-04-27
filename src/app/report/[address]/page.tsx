"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReportRenderer from "@/components/ReportRenderer";

const LOADING_MESSAGES = [
  "正在调取链上数据...",
  "AI在研究你的操作...",
  "正在给你的仓位做CT扫描...",
  "计算你的交易DNA...",
  "确认你是哪种交易猫...",
  "AI：麻了，这数据有点抽象...",
  "正在润色毒舌评语...",
  "最后检查一遍，确保数据准确...",
  "马上好了，做好心理准备...",
];

interface ReportData {
  address: string;
  markdown: string;
  archetype: string;
  archetypeLabel: string;
  grade: string;
  netPnl: number;
  winRate: number;
  totalFills: number;
  generatedAt: string;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
};

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const sessionId = searchParams.get("session");

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const msgIdx = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      msgIdx.current = (msgIdx.current + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx.current]);
    }, 3500);

    if (!sessionId) {
      loadReport();
      clearInterval(msgTimer);
      return;
    }

    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${sessionId}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(pollTimer.current!);
          clearInterval(msgTimer);
          loadReport();
        } else if (data.status === "error") {
          clearInterval(pollTimer.current!);
          clearInterval(msgTimer);
          setError(data.error ?? "生成失败，请返回重试");
          setLoading(false);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 2500);

    return () => {
      clearInterval(pollTimer.current!);
      clearInterval(msgTimer);
    };
  }, [sessionId]);

  async function loadReport() {
    try {
      const res = await fetch(`/api/report/${address}`);
      if (!res.ok) {
        setError("报告未找到，请返回重新生成");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReport(data);
    } catch {
      setError("加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    if (!report) return;
    const pnlStr =
      report.netPnl >= 0
        ? `+$${Math.abs(report.netPnl).toFixed(0)}`
        : `-$${Math.abs(report.netPnl).toFixed(0)}`;
    const text = `刚用AI分析了我的 Hyperliquid 交易历史\n\n我的交易类型：「${report.archetypeLabel}」\n综合评级：${report.grade}级\n净盈亏：${pnlStr} · 胜率：${(report.winRate * 100).toFixed(1)}%\n\n交易来时路 → lai-shi-lu.com`;
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "var(--bg)" }}
      >
        <div style={{ height: 3, background: "var(--accent)", position: "fixed", top: 0, left: 0, right: 0 }} />
        <div className="w-full max-w-sm">
          <div
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--accent)", ...MONO }}
          >
            ANALYZING TRADES
          </div>
          <div
            className="text-sm font-semibold mb-6"
            style={{ color: "var(--text)", ...MONO, minHeight: "1.5rem" }}
          >
            {loadingMsg}
            <span className="cursor-blink">_</span>
          </div>
          <div
            className="overflow-hidden mb-2"
            style={{ height: 2, background: "var(--border)" }}
          >
            <div
              style={{
                height: "100%",
                background: "var(--accent)",
                animation: "progress-bar 45s linear forwards",
                width: "0%",
              }}
            />
          </div>
          <div
            className="flex justify-between text-xs mt-2"
            style={{ color: "var(--text-dim)", ...MONO }}
          >
            <span>
              {address.slice(0, 10)}...{address.slice(-6)}
            </span>
            <span>30–60s</span>
          </div>
          <p className="text-xs mt-6" style={{ color: "var(--text-dim)", ...MONO }}>
            // 可关闭此页面，稍后用相同 URL 查看报告
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-dim)", ...MONO }}>
            // HL API 仅返回最近约 10,000 条成交记录
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ background: "var(--bg)" }}
      >
        <div style={{ height: 3, background: "var(--accent)", position: "fixed", top: 0, left: 0, right: 0 }} />
        <div
          className="w-full max-w-sm p-6 border"
          style={{ borderColor: "var(--accent)", borderLeft: "4px solid var(--accent)" }}
        >
          <div className="text-xs tracking-widest mb-3" style={{ color: "var(--accent)", ...MONO }}>
            ERROR
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {error}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 text-sm font-bold tracking-widest"
            style={{ background: "var(--accent)", color: "#fff", ...MONO }}
          >
            ← 返回
          </a>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const pnlPositive = report.netPnl >= 0;
  const pnlValue = `${pnlPositive ? "+" : ""}$${
    Math.abs(report.netPnl) >= 10000
      ? (Math.abs(report.netPnl) / 10000).toFixed(1) + "万"
      : Math.abs(report.netPnl).toFixed(0)
  }`;

  const winColor =
    report.winRate >= 0.5
      ? "var(--green)"
      : report.winRate >= 0.4
      ? "#FF8800"
      : "var(--red)";

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Danger stripe */}
      <div style={{ height: 3, background: "var(--accent)" }} />

      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(13,13,13,0.95)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <a
          href="/"
          className="text-sm font-black"
          style={{ color: "var(--text)", fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          ← 交易来时路
        </a>
        <div className="flex items-center gap-2.5">
          <span className={`grade-${report.grade} px-2 py-0.5 text-xs`}>
            {report.grade}级
          </span>
          <span
            className="text-xs font-semibold hidden sm:block"
            style={{ color: "var(--text-muted)" }}
          >
            {report.archetypeLabel}
          </span>
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 text-xs font-bold tracking-widest text-white transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", ...MONO }}
          >
            分享 ↗
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Truncation warning */}
        {report.totalFills >= 10000 && (
          <div
            className="mb-6 px-4 py-3 text-sm font-semibold"
            style={{
              background: "rgba(255,208,0,0.07)",
              borderLeft: "3px solid var(--gold)",
              color: "var(--gold)",
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            ⚠ 你的成交记录超过 10,000 笔，本报告仅覆盖最近 10k 条数据，不代表完整交易历史。
          </div>
        )}

        {/* Stats — 3 sharp cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            label="净盈亏"
            value={pnlValue}
            color={pnlPositive ? "var(--green)" : "var(--red)"}
            accentBorder={pnlPositive ? "var(--green)" : "var(--red)"}
          />
          <StatCard
            label="胜率"
            value={`${(report.winRate * 100).toFixed(1)}%`}
            color={winColor}
            accentBorder={winColor}
          />
          <StatCard
            label="成交笔数"
            value={report.totalFills.toLocaleString()}
            color="var(--text)"
            accentBorder="var(--border-bright)"
          />
        </div>

        {/* Report markdown */}
        <ReportRenderer markdown={report.markdown} />

        {/* Share card */}
        <div
          className="mt-10 p-5 border"
          style={{ borderColor: "var(--border)", borderLeft: "3px solid var(--accent)" }}
        >
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
            报告已生成，分享给朋友？
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={handleShare}
              className="px-5 py-2.5 text-sm font-bold tracking-widest text-white transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", ...MONO }}
            >
              发推特 / Twitter
            </button>
            <button
              onClick={() => {
                if (!report) return;
                const text = `我的交易类型：「${report.archetypeLabel}」\n评级：${report.grade}级\n\n交易来时路帮我分析了我的链上交易历史\n数据不会骗人，AI也不会惯着你\n\nlai-shi-lu.com`;
                navigator.clipboard.writeText(text);
              }}
              className="px-5 py-2.5 text-sm font-bold tracking-widest transition-colors"
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                ...MONO,
              }}
            >
              复制小红书文案
            </button>
            <button
              onClick={() => {
                if (!report) return;
                const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `交易来时路_${report.address.slice(0, 8)}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-5 py-2.5 text-sm font-bold tracking-widest transition-colors"
              style={{
                background: "transparent",
                color: "var(--gold)",
                border: "1px solid var(--gold)",
                ...MONO,
              }}
            >
              下载 .md ↓
            </button>
          </div>
        </div>

        {/* Cost */}
        {report.costUsd !== null && (
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <span
              className="text-xs px-3 py-1.5 font-semibold cursor-help"
              title={`${report.inputTokens?.toLocaleString()} 输入 · ${report.outputTokens?.toLocaleString()} 输出`}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                ...MONO,
              }}
            >
              消耗算力{" "}
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                ${report.costUsd.toFixed(3)}
              </span>
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-dim)", ...MONO }}
            >
              // 脚本算账，AI写报告，成本可控
            </span>
          </div>
        )}

        <p
          className="text-center text-xs mt-5"
          style={{ color: "var(--text-dim)", ...MONO }}
        >
          // 仅供娱乐 · 不构成投资建议 · 数据来自 Hyperliquid 公开API · 仅含最近约 10,000 条成交记录
        </p>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  accentBorder,
}: {
  label: string;
  value: string;
  color: string;
  accentBorder: string;
}) {
  return (
    <div
      className="p-3 sm:p-4"
      style={{
        background: "var(--bg-card)",
        borderTop: `3px solid ${accentBorder}`,
        border: "1px solid var(--border)",
        borderTopColor: accentBorder,
      }}
    >
      <div
        className="text-base sm:text-lg font-black"
        style={{ color, fontFamily: '"JetBrains Mono", monospace' }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-1 font-semibold"
        style={{ color: "var(--text-dim)", fontFamily: '"JetBrains Mono", monospace' }}
      >
        {label}
      </div>
    </div>
  );
}
