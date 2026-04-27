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

// Cost estimate: LLM only writes the narrative. Scripts handle all math.
// ~17K fixed tokens (system prompt + skill + market context) + variable summary JSON.
// Sonnet pricing: $3/M input, $15/M output.
function estimateCost(uniqueAssets: number): string {
  const inputTokens = 17000 + uniqueAssets * 60;
  const outputTokens = 1300;
  const usd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  return `$${usd.toFixed(2)}`;
}

interface ReportData {
  address: string;
  markdown: string;
  archetype: string;
  archetypeLabel: string;
  grade: string;
  netPnl: number;
  winRate: number;
  totalFills: number;
  uniqueAssets: number;
  generatedAt: string;
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
    // Rotate loading messages
    const msgTimer = setInterval(() => {
      msgIdx.current = (msgIdx.current + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx.current]);
    }, 3500);

    if (!sessionId) {
      // No session — try to load existing report directly
      loadReport();
      clearInterval(msgTimer);
      return;
    }

    // Poll for completion
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          {/* Mirror animation */}
          <div className="text-5xl" style={{ filter: "grayscale(0.5)" }}>🪞</div>

          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "#666" }}>
              {loadingMsg}
            </p>
            <p className="text-xs font-mono" style={{ color: "#333" }}>
              {address.slice(0, 10)}...{address.slice(-6)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-48 h-0.5 mx-auto rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #7c6af7, #5b4fd4)",
                animation: "progress-bar 45s linear forwards",
                width: "0%",
              }}
            />
          </div>

          <p className="text-xs" style={{ color: "#2a2a2a" }}>
            AI 分析通常需要 30-60 秒
          </p>
        </div>

        <style>{`
          @keyframes progress-bar {
            0% { width: 0%; }
            80% { width: 85%; }
            100% { width: 90%; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">😵</p>
        <p className="text-sm mb-6" style={{ color: "#666" }}>{error}</p>
        <a href="/"
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "#1a1a1a", color: "#888" }}>
          ← 返回
        </a>
      </div>
    );
  }

  if (!report) return null;

  return (
    <main className="min-h-screen">
      {/* Header bar */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #161616" }}>
        <a href="/" className="text-sm font-bold" style={{ color: "#555" }}>
          ← 交易来时路
        </a>
        <div className="flex items-center gap-3">
          {/* Grade badge */}
          <span className={`grade-${report.grade} px-2 py-0.5 rounded text-xs font-bold`}>
            {report.grade}级
          </span>
          <span className="text-xs" style={{ color: "#444" }}>{report.archetypeLabel}</span>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "#161616", color: "#777", border: "1px solid #222" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#aaa")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#777")}
          >
            分享 ↗
          </button>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Key stats card */}
        <div className="rounded-xl p-4 mb-6 grid grid-cols-3 gap-4"
          style={{ background: "#111", border: "1px solid #1a1a1a" }}>
          <StatCell
            label="净盈亏"
            value={`${report.netPnl >= 0 ? "+" : ""}$${Math.abs(report.netPnl) >= 10000
              ? (Math.abs(report.netPnl) / 10000).toFixed(1) + "万"
              : Math.abs(report.netPnl).toFixed(0)}`}
            color={report.netPnl >= 0 ? "var(--green)" : "var(--red)"}
          />
          <StatCell
            label="胜率"
            value={`${(report.winRate * 100).toFixed(1)}%`}
            color={report.winRate >= 0.5 ? "var(--green)" : report.winRate >= 0.4 ? "var(--gold)" : "var(--red)"}
          />
          <StatCell
            label="成交笔数"
            value={report.totalFills.toLocaleString()}
            color="#666"
          />
        </div>

        {/* The report */}
        <ReportRenderer markdown={report.markdown} />

        {/* Share card */}
        <div className="mt-10 p-4 rounded-xl text-center space-y-3"
          style={{ background: "#111", border: "1px solid #1a1a1a" }}>
          <p className="text-sm" style={{ color: "#555" }}>你的报告已经准备好了，分享给朋友？</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleShare}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#1a1a2a", color: "#7c6af7", border: "1px solid #2a2040" }}>
              发推特 / Twitter
            </button>
            <button onClick={() => {
              if (!report) return;
              const text = `我的交易类型：「${report.archetypeLabel}」\n评级：${report.grade}级\n\n交易来时路帮我分析了我的链上交易历史\n数据不会骗人，AI也不会惯着你 🪞\n\nlai-shi-lu.com`;
              navigator.clipboard.writeText(text);
            }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#1a1a1a", color: "#666", border: "1px solid #222" }}>
              复制小红书文案
            </button>
          </div>
        </div>

        {/* Cost transparency */}
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ background: "#111", border: "1px solid #1a1a1a", color: "#3a3a3a" }}>
            本次分析消耗约 <span style={{ color: "#444" }}>{estimateCost(report.uniqueAssets)}</span> 算力
          </span>
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ background: "#111", border: "1px solid #1a1a1a", color: "#3a3a3a" }}>
            脚本算账，AI写报告，成本可控
          </span>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#2a2a2a" }}>
          仅供娱乐 · 不构成投资建议 · 数据来自 Hyperliquid 公开API
        </p>
      </div>
    </main>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "#444" }}>{label}</div>
    </div>
  );
}
