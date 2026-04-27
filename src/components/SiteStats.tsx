"use client";

import { useEffect, useState } from "react";

const BAR_COLORS = [
  "#FF1A2E",
  "#FF8800",
  "#FFD000",
  "#00E85A",
  "#00C8FF",
  "#FF69B4",
];

interface Stats {
  total: number;
  archetypes: { label: string; count: number }[];
}

const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
};

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
    <div
      className="border-t px-4 py-6"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-lg mx-auto">
        <div
          className="text-xs tracking-widest mb-4"
          style={{ color: "var(--text-dim)", ...MONO }}
        >
          REPORTS_GENERATED ={" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            {stats.total}
          </span>
        </div>

        {stats.archetypes.length > 0 && (
          <div className="space-y-2.5">
            {stats.archetypes.map((a, i) => {
              const pct = Math.round((a.count / stats.total) * 100);
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={a.label} className="flex items-center gap-3">
                  <span
                    className="text-xs w-28 shrink-0 text-right"
                    style={{ color: "var(--text-muted)", fontFamily: '"Noto Sans SC", sans-serif' }}
                  >
                    {a.label}
                  </span>
                  <div
                    className="flex-1 overflow-hidden"
                    style={{ height: 3, background: "var(--border)" }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: color,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs w-8 shrink-0 font-bold"
                    style={{ color, ...MONO }}
                  >
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
