"use client";

import { useEffect, useState } from "react";

interface RecentReport {
  address: string;
  grade: string;
  archetypeLabel: string;
  netPnl: number;
  winRate: number;
}

interface Stats {
  total: number;
  recent: RecentReport[];
}

const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
};

const GRADE_COLORS: Record<string, string> = {
  S: "#FFD000",
  A: "#00E85A",
  B: "#00C8FF",
  C: "#FF8800",
  D: "#FF1A2E",
  F: "#555",
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
    <div className="border-t" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div
          className="text-xs tracking-widest mb-4"
          style={{ color: "var(--text-dim)", ...MONO }}
        >
          REPORTS_GENERATED ={" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            {stats.total}
          </span>
        </div>

        <div className="space-y-1">
          {stats.recent.map((r) => {
            const pnlPos = r.netPnl >= 0;
            const pnlStr = `${pnlPos ? "+" : ""}$${
              Math.abs(r.netPnl) >= 10000
                ? (Math.abs(r.netPnl) / 10000).toFixed(1) + "万"
                : Math.abs(r.netPnl).toFixed(0)
            }`;
            const gradeColor = GRADE_COLORS[r.grade] ?? "var(--text-muted)";

            return (
              <a
                key={r.address}
                href={`/report/${r.address}`}
                className="flex items-center gap-3 px-3 py-2 transition-colors"
                style={{
                  background: "transparent",
                  border: "1px solid transparent",
                  display: "flex",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                }}
              >
                {/* Grade */}
                <span
                  className="text-xs font-black w-6 shrink-0 text-center"
                  style={{ color: gradeColor, ...MONO }}
                >
                  {r.grade}
                </span>

                {/* Address */}
                <span
                  className="text-xs shrink-0 hidden sm:block"
                  style={{ color: "var(--text-dim)", ...MONO }}
                >
                  {r.address.slice(0, 8)}…{r.address.slice(-6)}
                </span>

                {/* Archetype */}
                <span
                  className="text-xs flex-1 truncate"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: '"Noto Sans SC", sans-serif',
                  }}
                >
                  {r.archetypeLabel}
                </span>

                {/* PnL */}
                <span
                  className="text-xs font-bold shrink-0"
                  style={{ color: pnlPos ? "var(--green)" : "var(--red)", ...MONO }}
                >
                  {pnlStr}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
