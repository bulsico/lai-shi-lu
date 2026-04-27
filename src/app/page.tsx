"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteStats from "@/components/SiteStats";

const ARCHETYPES = [
  { label: "过度交易内耗型", color: "#FF2D78", bg: "rgba(255,45,120,0.1)" },
  { label: "左侧接刀殉道者", color: "#FF9500", bg: "rgba(255,149,0,0.12)" },
  { label: "机枪扫射型", color: "#B45309", bg: "rgba(250,204,21,0.2)" },
  { label: "右侧交易大师", color: "#00A846", bg: "rgba(0,200,83,0.1)" },
  { label: "情绪化清仓机", color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  { label: "钻石手候鸟", color: "#0891B2", bg: "rgba(6,182,212,0.1)" },
];

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

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
        router.push(`/report/${trimmed.toLowerCase()}`);
      } else if (data.sessionId) {
        router.push(
          `/report/${trimmed.toLowerCase()}?session=${data.sessionId}`,
        );
      }
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="bg-blob w-[500px] h-[500px]"
        style={{ top: "-8rem", left: "-8rem", background: "#FF2D78" }}
      />
      <div
        className="bg-blob w-96 h-96"
        style={{ top: "30%", right: "-6rem", background: "#7C3AED" }}
      />
      <div
        className="bg-blob w-80 h-80"
        style={{ bottom: "8rem", left: "30%", background: "#06B6D4" }}
      />

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-12">
        {/* Mirror emoji */}
        <div
          className="text-7xl mb-6 select-none"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          🪞
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1
            className="text-6xl font-black tracking-tight mb-3"
            style={{
              background:
                "linear-gradient(135deg, #FF2D78 0%, #7C3AED 50%, #06B6D4 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradient-shift 4s ease infinite",
            }}
          >
            交易来时路
          </h1>
          <p
            className="text-base font-semibold mt-2 max-w-xs mx-auto leading-relaxed"
            style={{ color: "#6B5F80" }}
          >
            用AI蒸馏你的交易历史 ✨
          </p>
          <p className="text-sm mt-1" style={{ color: "#A89EC4" }}>
            数据不会骗人，AI也不会惯着你
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-lg">
          <div
            className="rounded-3xl p-2 transition-all duration-300"
            style={{
              background: "#fff",
              boxShadow: focused
                ? "0 0 0 4px rgba(124,58,237,0.25), 0 16px 48px rgba(124,58,237,0.15)"
                : "0 8px 32px rgba(0,0,0,0.1)",
              border: error ? "2px solid #FF2D55" : "2px solid transparent",
            }}
          >
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x... 粘贴你的 Hyperliquid 地址"
                className="flex-1 px-5 py-3.5 rounded-2xl text-sm font-mono outline-none bg-transparent"
                style={{ color: "#0D0616", caretColor: "#7C3AED" }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={loading}
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-200"
                style={{
                  background:
                    loading || !address.trim()
                      ? "linear-gradient(135deg, #DDD6FE, #E9D5FF)"
                      : "linear-gradient(135deg, #FF2D78, #7C3AED)",
                  color: loading || !address.trim() ? "#A89EC4" : "#fff",
                  boxShadow:
                    loading || !address.trim()
                      ? "none"
                      : "0 4px 16px rgba(124,58,237,0.4)",
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span>分析中</span>
                    <span className="flex gap-1 items-center">
                      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                      <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                    </span>
                  </span>
                ) : (
                  "开始分析 🚀"
                )}
              </button>
            </form>
          </div>

          {error && (
            <p
              className="text-xs px-2 mt-2 font-semibold"
              style={{ color: "#FF2D55" }}
            >
              {error}
            </p>
          )}

          <p
            className="text-center text-xs mt-4 font-medium"
            style={{ color: "#C4B5FD" }}
          >
            只需要公开地址，无需签名或授权 · HL API 最多返回约 10k 条成交记录
          </p>
        </div>

        {/* Archetype pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2 max-w-md">
          {ARCHETYPES.map(({ label, color, bg }) => (
            <span
              key={label}
              className="px-4 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: bg,
                color,
                border: `1.5px solid ${color}40`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <p className="text-xs mt-3 font-semibold" style={{ color: "#A89EC4" }}>
          你是哪种交易员？👇
        </p>
      </div>

      {/* Stats bar */}
      <div className="relative z-10">
        <SiteStats />
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 text-center py-6 text-xs font-medium"
        style={{ color: "#A89EC4" }}
      >
        <div className="mb-1">
          <span>仅供娱乐，不构成投资建议</span>
          <span className="mx-2">·</span>
          <a
            href="https://github.com/bulsico/lai-shi-lu"
            style={{ color: "#7C3AED" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub 开源 ↗
          </a>
        </div>
        <div>
          Robinhood 用户？自己跑本地版 →{" "}
          <a
            href="https://github.com/bulsico/lai-shi-lu#portable-skill"
            style={{ color: "#7C3AED" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看说明 ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
