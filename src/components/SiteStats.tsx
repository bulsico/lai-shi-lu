"use client";

import { useEffect, useState } from "react";

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
    <div className="border-t px-4 py-6" style={{ borderColor: "#181818" }}>
      <div className="max-w-lg mx-auto">
        <p className="text-center text-xs mb-4" style={{ color: "#333" }}>
          已为 <span style={{ color: "#555" }}>{stats.total}</span> 位交易员生成过报告
        </p>
        {stats.archetypes.length > 0 && (
          <div className="space-y-2">
            {stats.archetypes.map((a) => {
              const pct = Math.round((a.count / stats.total) * 100);
              return (
                <div key={a.label} className="flex items-center gap-3">
                  <span className="text-xs w-28 shrink-0 text-right" style={{ color: "#444" }}>
                    {a.label}
                  </span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: "#333" }}
                    />
                  </div>
                  <span className="text-xs w-8 shrink-0" style={{ color: "#333" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
