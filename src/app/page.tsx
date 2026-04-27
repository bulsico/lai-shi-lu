"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteStats from "@/components/SiteStats";

const ARCHETYPES = [
  { label: "过度交易内耗型", accent: "#FF1A2E" },
  { label: "左侧接刀殉道者", accent: "#FF8800" },
  { label: "机枪扫射型", accent: "#FFD000" },
  { label: "右侧交易大师", accent: "#00E85A" },
  { label: "情绪化清仓机", accent: "#00C8FF" },
  { label: "钻石手候鸟", accent: "#FF69B4" },
];

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [existingReport, setExistingReport] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = address.trim();
    if (!trimmed.match(/^0x[0-9a-fA-F]{40}$/)) {
      setError("请输入有效的 Hyperliquid 地址（0x 开头，42位十六进制）");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "请求失败，请稍后再试");
        setLoading(false);
        return;
      }
      if (data.status === "done") {
        setExistingReport(true);
        setTimeout(() => router.push(`/report/${trimmed.toLowerCase()}`), 1500);
        return;
      } else if (data.sessionId) {
        router.push(`/report/${trimmed.toLowerCase()}?session=${data.sessionId}`);
      }
    } catch {
      setError("网络错误，请检查连接后重试");
      setLoading(false);
    }
  }

  const inputBorder = error
    ? "var(--red)"
    : focused
    ? "var(--accent)"
    : "var(--border)";

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Danger stripe */}
      <div style={{ height: 3, background: "var(--accent)", flexShrink: 0 }} />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Title block */}
        <div className="w-full max-w-lg mb-10">
          <div
            className="font-mono text-xs tracking-widest mb-3"
            style={{ color: "var(--accent)", fontFamily: '"JetBrains Mono", monospace' }}
          >
            HYPERLIQUID · AI TRADING REVIEW
          </div>

          <h1
            className="font-black leading-none mb-3"
            style={{
              fontSize: "clamp(3.2rem, 12vw, 5.5rem)",
              color: "var(--text)",
              fontFamily: '"Noto Sans SC", sans-serif',
              letterSpacing: "-0.01em",
              animation: "flicker 8s ease-in-out infinite",
            }}
          >
            交易来时路
          </h1>

          <div
            style={{
              height: 4,
              background: "var(--accent)",
              width: "100%",
              marginBottom: "1rem",
            }}
          />

          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            用AI蒸馏你的交易历史 · 数据不会骗人，AI也不会惯着你
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... 粘贴你的 Hyperliquid 地址"
              className="flex-1 px-4 py-3.5 text-sm outline-none w-full"
              style={{
                background: "var(--bg-card)",
                color: "var(--text)",
                border: `1px solid ${inputBorder}`,
                borderRight: "none",
                caretColor: "var(--accent)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.8rem",
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={loading}
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 font-bold text-sm tracking-widest whitespace-nowrap transition-colors"
              style={{
                background: loading ? "var(--bg-card)" : "var(--accent)",
                color: loading ? "var(--text-dim)" : "#fff",
                border: `1px solid ${loading ? "var(--border)" : "var(--accent)"}`,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.06em",
              }}
            >
              {loading ? (
                <>分析中<span className="cursor-blink">_</span></>
              ) : (
                "分析 →"
              )}
            </button>
          </form>

          {error && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--red)", fontFamily: '"JetBrains Mono", monospace' }}
            >
              ⚠ {error}
            </p>
          )}

          <p
            className="text-xs mt-3"
            style={{ color: "var(--text-dim)", fontFamily: '"JetBrains Mono", monospace' }}
          >
            // 只需要公开地址，无需签名或授权 · HL API 最多约 10k 条成交记录
          </p>
        </div>

        {/* Archetype chips */}
        <div className="mt-12 w-full max-w-lg">
          <div
            className="text-xs mb-3 tracking-widest"
            style={{
              color: "var(--text-dim)",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            YOUR_ARCHETYPE = ?
          </div>
          <div className="flex flex-wrap gap-2">
            {ARCHETYPES.map(({ label, accent }) => (
              <span
                key={label}
                className="px-3 py-1.5 text-xs font-bold"
                style={{
                  borderLeft: `3px solid ${accent}`,
                  background: `${accent}14`,
                  color: accent,
                  fontFamily: '"Noto Sans SC", sans-serif',
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <SiteStats />

      {/* Existing report overlay */}
      {existingReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(13,13,13,0.97)" }}
        >
          <div className="w-full max-w-sm">
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--accent)", fontFamily: '"JetBrains Mono", monospace' }}
            >
              EXISTING REPORT FOUND
            </div>
            <div
              className="text-xl font-black mb-2"
              style={{ color: "var(--text)", fontFamily: '"Noto Sans SC", sans-serif' }}
            >
              已有历史报告
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--text-muted)", fontFamily: '"JetBrains Mono", monospace' }}
            >
              正在加载报告<span className="cursor-blink">_</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="px-4 py-5 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="max-w-lg mx-auto flex flex-wrap justify-between gap-y-2 gap-x-4 text-xs"
          style={{
            color: "var(--text-dim)",
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <span>// 仅供娱乐，不构成投资建议</span>
          <div className="flex gap-4">
            <a
              href="https://github.com/bulsico/lai-shi-lu"
              style={{ color: "var(--accent)" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              GITHUB ↗
            </a>
            <a
              href="https://github.com/bulsico/lai-shi-lu#portable-skill"
              style={{ color: "var(--text-muted)" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              PORTABLE ↗
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
