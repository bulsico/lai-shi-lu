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
    const pnlStr = report.netPnl >= 0
      ? `+$${Math.abs(report.netPnl).toFixed(0)}`
      : `-$${Math.abs(report.netPnl).toFixed(0)}`;
    const text = `刚用AI分析了我的 Hyperliquid 交易历史\n\n我的交易类型：「${report.archetypeLabel}」\n综合评级：${report.grade}级\n净盈亏：${pnlStr} · 胜率：${(report.winRate * 100).toFixed(1)}%\n\n交易来时路 → lai-shi-lu.com`;
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="bg-blob w-96 h-96" style={{ top: "-6rem", left: "-6rem", background: "#FF2D78" }} />
        <div className="bg-blob w-80 h-80" style={{ bottom: "4rem", right: "-5rem", background: "#7C3AED" }} />

        <div className="relative z-10 text-center space-y-6 max-w-sm w-full">
          <div className="text-6xl select-none" style={{ animation: "float 2.5s ease-in-out infinite" }}>
            🪞
          </div>

          <div>
            <p className="text-base font-bold mb-2" style={{ color: "#0D0616" }}>
              {loadingMsg}
            </p>
            <p className="text-xs font-mono" style={{ color: "#A89EC4" }}>
              {address.slice(0, 10)}...{address.slice(-6)}
            </p>
          </div>

          {/* Colorful progress bar */}
          <div className="w-64 h-2.5 mx-auto rounded-full overflow-hidden" style={{ background: "#E0D0FF" }}>
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #FF2D78, #7C3AED, #06B6D4)",
                backgroundSize: "200% 100%",
                animation: "progress-bar 45s linear forwards, gradient-shift 3s ease infinite",
                width: "0%",
              }}
            />
          </div>

          <p className="text-sm font-semibold" style={{ color: "#A89EC4" }}>
            AI 分析通常需要 30–60 秒 ☕
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
        <div className="bg-blob w-96 h-96" style={{ top: "-6rem", left: "-6rem", background: "#FF2D78" }} />
        <div className="bg-blob w-80 h-80" style={{ bottom: "4rem", right: "-5rem", background: "#7C3AED" }} />

        <div className="relative z-10">
          <p className="text-5xl mb-4">😵</p>
          <p className="text-sm font-semibold mb-8" style={{ color: "#6B5F80" }}>{error}</p>
          <a
            href="/"
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #FF2D78, #7C3AED)", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}
          >
            ← 返回重试
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

  return (
    <main className="min-h-screen">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(244,238,255,0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1.5px solid #E0D0FF",
        }}
      >
        <a
          href="/"
          className="text-sm font-black"
          style={{
            background: "linear-gradient(135deg, #FF2D78, #7C3AED)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ← 交易来时路
        </a>
        <div className="flex items-center gap-2.5">
          <span className={`grade-${report.grade} px-2.5 py-0.5 rounded-lg text-xs font-black`}>
            {report.grade}级
          </span>
          <span className="text-xs font-semibold hidden sm:block" style={{ color: "#6B5F80" }}>
            {report.archetypeLabel}
          </span>
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #FF2D78, #7C3AED)",
              boxShadow: "0 2px 10px rgba(124,58,237,0.3)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(124,58,237,0.3)")}
          >
            分享 ↗
          </button>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Key stats — 3 separate colorful cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Net PnL */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "#fff",
              borderTop: `4px solid ${pnlPositive ? "#00C853" : "#FF2D55"}`,
              boxShadow: `0 4px 20px ${pnlPositive ? "rgba(0,200,83,0.12)" : "rgba(255,45,85,0.12)"}`,
            }}
          >
            <div className="text-lg font-black font-mono" style={{ color: pnlPositive ? "#00A846" : "#FF2D55" }}>
              {pnlValue}
            </div>
            <div className="text-xs mt-1 font-semibold" style={{ color: "#A89EC4" }}>净盈亏</div>
          </div>

          {/* Win rate */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "#fff",
              borderTop: `4px solid ${report.winRate >= 0.5 ? "#7C3AED" : report.winRate >= 0.4 ? "#FF9500" : "#FF2D55"}`,
              boxShadow: "0 4px 20px rgba(124,58,237,0.1)",
            }}
          >
            <div
              className="text-lg font-black font-mono"
              style={{
                color: report.winRate >= 0.5 ? "#7C3AED" : report.winRate >= 0.4 ? "#C47800" : "#FF2D55",
              }}
            >
              {(report.winRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs mt-1 font-semibold" style={{ color: "#A89EC4" }}>胜率</div>
          </div>

          {/* Total fills */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "#fff",
              borderTop: "4px solid #06B6D4",
              boxShadow: "0 4px 20px rgba(6,182,212,0.1)",
            }}
          >
            <div className="text-lg font-black font-mono" style={{ color: "#0891B2" }}>
              {report.totalFills.toLocaleString()}
            </div>
            <div className="text-xs mt-1 font-semibold" style={{ color: "#A89EC4" }}>成交笔数</div>
          </div>
        </div>

        {/* The report */}
        <ReportRenderer markdown={report.markdown} />

        {/* Share card */}
        <div
          className="mt-10 p-5 rounded-2xl text-center space-y-4"
          style={{
            background: "#fff",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: "0 0 0 2px #C4A8F5, 0 8px 32px rgba(124,58,237,0.1)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "#6B5F80" }}>
            你的报告已经准备好了，分享给朋友？🎉
          </p>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <button
              onClick={handleShare}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #FF2D78, #7C3AED)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.35)")}
            >
              发推特 / Twitter
            </button>
            <button
              onClick={() => {
                if (!report) return;
                const text = `我的交易类型：「${report.archetypeLabel}」\n评级：${report.grade}级\n\n交易来时路帮我分析了我的链上交易历史\n数据不会骗人，AI也不会惯着你 🪞\n\nlai-shi-lu.com`;
                navigator.clipboard.writeText(text);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "rgba(124,58,237,0.08)",
                color: "#7C3AED",
                border: "1.5px solid #C4A8F5",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.08)")}
            >
              复制小红书文案
            </button>
          </div>
        </div>

        {/* Cost transparency */}
        {report.costUsd !== null && (
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold cursor-help"
              title={`${report.inputTokens?.toLocaleString()} 输入 · ${report.outputTokens?.toLocaleString()} 输出`}
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid #C4A8F5", color: "#7C3AED" }}
            >
              本次分析消耗{" "}
              <span className="font-black">${report.costUsd.toFixed(3)}</span> 算力
            </span>
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: "rgba(124,58,237,0.05)", border: "1px solid #E0D0FF", color: "#A89EC4" }}
            >
              脚本算账，AI写报告，成本可控
            </span>
          </div>
        )}

        <p className="text-center text-xs mt-5 font-medium" style={{ color: "#C4B5FD" }}>
          仅供娱乐 · 不构成投资建议 · 数据来自 Hyperliquid 公开API
        </p>
      </div>
    </main>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
