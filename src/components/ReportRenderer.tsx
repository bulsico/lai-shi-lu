"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  markdown: string;
}

export default function ReportRenderer({ markdown }: Props) {
  return (
    <div className="report-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Color P&L numbers in table cells and text
          td({ children, ...props }) {
            const text = String(children);
            let color = "";
            if (text.startsWith("+$") || text.startsWith("+")) color = "var(--green)";
            else if (text.startsWith("-$") || (text.startsWith("-") && text.includes("$"))) color = "var(--red)";
            return (
              <td {...props} style={color ? { color } : {}}>
                {children}
              </td>
            );
          },
          // Grade badges in text
          strong({ children }) {
            const text = String(children);
            const gradeMatch = text.match(/^([SABCDF])级/);
            if (gradeMatch) {
              const grade = gradeMatch[1];
              return (
                <strong>
                  <span
                    className={`grade-${grade} inline-block px-2 py-0.5 rounded text-xs font-bold mr-1`}
                  >
                    {grade}
                  </span>
                  {text.slice(2)}
                </strong>
              );
            }
            // Color P&L in bold
            if (text.startsWith("+$")) return <strong style={{ color: "var(--green)" }}>{children}</strong>;
            if (text.startsWith("-$")) return <strong style={{ color: "var(--red)" }}>{children}</strong>;
            return <strong>{children}</strong>;
          },
          // Horizontal rules as section separators
          hr() {
            return (
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
                <span className="text-xs" style={{ color: "#333" }}>◆</span>
                <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
              </div>
            );
          },
          // Code blocks (used for the pre-formatted progress bars)
          code({ className, children, ...props }) {
            const isBlock = !!(className || String(children).includes("\n"));
            if (!isBlock) {
              return (
                <code {...props} className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "#1a1a1a", color: "var(--gold)" }}>
                  {children}
                </code>
              );
            }
            // Block code — used for progress bars
            const content = String(children);
            const lines = content.split("\n").filter(Boolean);
            const isProgressBlock = lines.some((l) => l.includes("█") || l.includes("░"));

            if (isProgressBlock) {
              return (
                <div className="space-y-2 my-3">
                  {lines.map((line, i) => {
                    const match = line.match(/^(.+?)\s+(█+░*)\s+(\d+)\/10\s*(.*)$/);
                    if (!match) return (
                      <div key={i} className="font-mono text-sm" style={{ color: "#666" }}>{line}</div>
                    );
                    const [, label, bars, score, comment] = match;
                    const filled = (bars.match(/█/g) || []).length;
                    const total = bars.length;
                    const pct = (filled / total) * 100;
                    const scoreNum = parseInt(score);
                    const barColor = scoreNum >= 7 ? "var(--green)" : scoreNum >= 4 ? "var(--gold)" : "var(--red)";

                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-24 shrink-0" style={{ color: "#888" }}>
                          {label.trim()}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                        <span className="text-xs w-8 shrink-0 font-mono" style={{ color: barColor }}>
                          {score}/10
                        </span>
                        {comment && (
                          <span className="text-xs hidden sm:block" style={{ color: "#444" }}>
                            {comment}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <pre className="rounded-xl overflow-x-auto p-4 my-3"
                style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <code className="text-sm font-mono" style={{ color: "#ccc" }} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
