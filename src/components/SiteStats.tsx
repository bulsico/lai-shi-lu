"use client";

import { useEffect, useState } from "react";

export default function SiteStats() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setTotal(d.total))
      .catch(() => null);
  }, []);

  if (!total) return null;

  return (
    <div className="border-t" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div
          className="text-xs tracking-widest"
          style={{ color: "var(--text-dim)", fontFamily: '"JetBrains Mono", monospace' }}
        >
          REPORTS_GENERATED ={" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}
