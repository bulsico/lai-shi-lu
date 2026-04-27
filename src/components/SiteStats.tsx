"use client";

import { useEffect, useState } from "react";

const BAR_GRADIENTS = [
  "linear-gradient(90deg, #FF2D78, #FF85A1)",
  "linear-gradient(90deg, #7C3AED, #A78BFA)",
  "linear-gradient(90deg, #06B6D4, #67E8F9)",
  "linear-gradient(90deg, #00C853, #69F0AE)",
  "linear-gradient(90deg, #FF9500, #FFD60A)",
  "linear-gradient(90deg, #FF2D55, #FF9580)",
];

interface Stats {
  total: number;
  archetypes: { label: string; count: number }[];
}

export default function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  if (!stats || stats.total === 0) return null;

  return (
    <div className="border-t px-4 py-6" style={{ borderColor: "#E0D0FF" }}>
      <div className="max-w-lg mx-auto">
        <p className="text-center text-xs mb-4 font-semibold" style={{ color: "#A89EC4" }}>
          已为{" "}
          <span
            className="font-black text-sm"
            style={{
              background: "linear-gradient(135deg, #FF2D78, #7C3AED)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {stats.total}
          </span>{" "}
          位交易员生成过报告
        </p>
        {stats.archetypes.length > 0 && (
          <div className="space-y-2.5">
            {stats.archetypes.map((a, i) => {
              const pct = Math.round((a.count / stats.total) * 100);
              return (
                <div key={a.label} className="flex items-center gap-3">
                  <span className="text-xs w-28 shrink-0 text-right font-semibold" style={{ color: "#6B5F80" }}>
                    {a.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#E0D0FF" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: BAR_GRADIENTS[i % BAR_GRADIENTS.length] }}
                    />
                  </div>
                  <span className="text-xs w-8 shrink-0 font-bold" style={{ color: "#7C3AED" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
