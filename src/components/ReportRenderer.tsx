"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  markdown: string;
  address?: string;
}

function nodeToString(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(nodeToString).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>;
    return nodeToString(el.props.children);
  }
  return "";
}

export default function ReportRenderer({ markdown, address }: Props) {
  return (
    <div className="report-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2({ children }) {
            if (address && nodeToString(children).includes("基本档案")) {
              return (
                <h2 className="flex items-center flex-wrap gap-x-3">
                  {children}
                  <a
                    href={`https://hyperdash.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                    style={{
                      color: "var(--gold)",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.75rem",
                      fontWeight: 400,
                    }}
                  >
                    Hyperdash ↗
                  </a>
                </h2>
              );
            }
            return <h2>{children}</h2>;
          },
          td({ children, ...props }) {
            const text = String(children);
            let color = "";
            if (text.startsWith("+$") || text.startsWith("+")) color = "var(--green)";
            else if (text.startsWith("-$") || (text.startsWith("-") && text.includes("$"))) color = "var(--red)";
            return (
              <td {...props} style={color ? { color, fontFamily: '"JetBrains Mono", monospace' } : {}}>
                {children}
              </td>
            );
          },
          strong({ children }) {
            const text = String(children);
            const gradeMatch = text.match(/^([SABCDF])级/);
            if (gradeMatch) {
              const grade = gradeMatch[1];
              return (
                <strong>
                  <span className={`grade-${grade} inline-block px-1.5 py-0.5 text-xs font-bold mr-1`}>
                    {grade}
                  </span>
                  {text.slice(2)}
                </strong>
              );
            }
            if (text.startsWith("+$")) return <strong style={{ color: "var(--green)", fontFamily: '"JetBrains Mono", monospace' }}>{children}</strong>;
            if (text.startsWith("-$")) return <strong style={{ color: "var(--red)", fontFamily: '"JetBrains Mono", monospace' }}>{children}</strong>;
            return <strong>{children}</strong>;
          },
          hr() {
            return (
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>◆</span>
                <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
              </div>
            );
          },
          code({ className, children, ...props }) {
            const isBlock = !!(className || String(children).includes("\n"));
            if (!isBlock) {
              return (
                <code
                  {...props}
                  className="font-mono text-xs px-1.5 py-0.5"
                  style={{ background: "#1A1A1A", color: "var(--gold)" }}
                >
                  {children}
                </code>
              );
            }
            const content = String(children);
            const lines = content.split("\n").filter(Boolean);
            const isProgressBlock = lines.some((l) => l.includes("█") || l.includes("░"));

            if (isProgressBlock) {
              return (
                <div className="space-y-2.5 my-3">
                  {lines.map((line, i) => {
                    const match = line.match(/^(.+?)\s+(█+░*)\s+(\d+)\/10\s*(.*)$/);
                    if (!match)
                      return (
                        <div key={i} className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
                          {line}
                        </div>
                      );
                    const [, label, bars, score, comment] = match;
                    const filled = (bars.match(/█/g) || []).length;
                    const total = bars.length;
                    const pct = (filled / total) * 100;
                    const scoreNum = parseInt(score);
                    const barColor =
                      scoreNum >= 7
                        ? "var(--green)"
                        : scoreNum >= 4
                        ? "var(--gold)"
                        : "var(--red)";

                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="text-xs w-24 shrink-0"
                          style={{ color: "var(--text-dim)", fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          {label.trim()}
                        </span>
                        <div
                          className="flex-1 overflow-hidden"
                          style={{ height: 3, background: "#1A1A1A" }}
                        >
                          <div style={{ width: `${pct}%`, height: "100%", background: barColor }} />
                        </div>
                        <span
                          className="text-xs w-8 shrink-0"
                          style={{ color: barColor, fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          {score}/10
                        </span>
                        {comment && (
                          <span
                            className="text-xs hidden sm:block"
                            style={{ color: "var(--text-dim)" }}
                          >
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
              <pre
                className="overflow-x-auto p-4 my-3"
                style={{ background: "#0A0A0A", border: "1px solid var(--border)" }}
              >
                <code
                  className="text-sm font-mono"
                  style={{ color: "var(--text-muted)" }}
                  {...props}
                >
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
