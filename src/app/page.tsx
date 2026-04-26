"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteStats from "@/components/SiteStats";

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        router.push(`/report/${trimmed.toLowerCase()}?session=${data.sessionId}`);
      }
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <span className="text-5xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e8e8e8 0%, #888 50%, #e8e8e8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
              交易来时路
            </span>
          </div>
          <p className="text-gray-500 text-base mt-3 max-w-sm mx-auto leading-relaxed">
            用AI蒸馏你的交易历史<br />
            回望你走过的每一步
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x... 输入你的 Hyperliquid 地址"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono
                  border transition-all outline-none
                  placeholder:text-gray-600"
                style={{
                  background: "#111",
                  border: error ? "1px solid #ff3b3b" : "1px solid #222",
                  color: "#e8e8e8",
                }}
                onFocus={(e) => {
                  if (!error) e.target.style.border = "1px solid #444";
                }}
                onBlur={(e) => {
                  if (!error) e.target.style.border = "1px solid #222";
                }}
                disabled={loading}
                spellCheck={false}
              />
            </div>

            {error && (
              <p className="text-xs px-1" style={{ color: "#ff3b3b" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading || !address.trim()
                  ? "#1a1a1a"
                  : "linear-gradient(135deg, #7c6af7, #5b4fd4)",
                color: "#fff",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span>正在分析</span>
                  <span className="flex gap-1">
                    <span className="loading-dot w-1 h-1 rounded-full bg-white inline-block" />
                    <span className="loading-dot w-1 h-1 rounded-full bg-white inline-block" />
                    <span className="loading-dot w-1 h-1 rounded-full bg-white inline-block" />
                  </span>
                </span>
              ) : (
                "开始分析 →"
              )}
            </button>
          </form>

          {/* Note */}
          <p className="text-center text-xs mt-4" style={{ color: "#444" }}>
            只需要公开地址，无需签名或授权 · HL API 最多返回约10k条成交记录
          </p>
        </div>

        {/* Archetype preview pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 max-w-md">
          {[
            "过度交易内耗型", "左侧接刀殉道者", "机枪扫射型",
            "右侧交易大师", "情绪化清仓机", "钻石手候鸟",
          ].map((type) => (
            <span key={type}
              className="px-3 py-1 rounded-full text-xs"
              style={{ background: "#161616", color: "#555", border: "1px solid #222" }}>
              {type}
            </span>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "#333" }}>你是哪种交易员？</p>
      </div>

      {/* Stats bar */}
      <SiteStats />

      {/* Footer */}
      <footer className="text-center py-6 text-xs" style={{ color: "#333" }}>
        <div className="mb-1">
          <span>仅供娱乐，不构成投资建议</span>
          <span className="mx-2">·</span>
          <a
            href="https://github.com/yourusername/lai-shi-lu"
            className="hover:text-gray-500 transition-colors"
            target="_blank" rel="noopener noreferrer"
          >
            GitHub 开源
          </a>
        </div>
        <div style={{ color: "#222" }}>
          Robinhood 用户？自己跑本地版 →{" "}
          <a href="https://github.com/yourusername/lai-shi-lu#portable-skill"
            className="hover:text-gray-500 transition-colors"
            target="_blank" rel="noopener noreferrer">
            查看说明
          </a>
        </div>
      </footer>
    </main>
  );
}
