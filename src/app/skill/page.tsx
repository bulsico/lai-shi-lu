const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
};

export const metadata = {
  title: "便携技能 · 交易来时路",
  description: "在你自己的 Claude Code 里运行交易来时路分析，支持 Hyperliquid 地址和 Robinhood CSV。",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto p-4 text-xs leading-relaxed"
      style={{
        background: "#0A0A0A",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        ...MONO,
      }}
    >
      {children}
    </pre>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div
        className="text-xs tracking-widest mb-4"
        style={{ color: "var(--accent)", ...MONO }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export default function SkillPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Danger stripe */}
      <div style={{ height: 3, background: "var(--accent)" }} />

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(13,13,13,0.95)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <a
          href="/"
          className="text-sm font-black"
          style={{ color: "var(--text)", fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          ← 交易来时路
        </a>
        <span className="text-xs" style={{ color: "var(--text-dim)", ...MONO }}>
          PORTABLE SKILL
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-10">
          <div
            className="text-xs tracking-widest mb-3"
            style={{ color: "var(--accent)", ...MONO }}
          >
            HYPERLIQUID · AI TRADING REVIEW
          </div>
          <h1
            className="font-black leading-none mb-3"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4rem)",
              color: "var(--text)",
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            便携技能
          </h1>
          <div style={{ height: 3, background: "var(--accent)", width: "100%", marginBottom: "1rem" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            在你自己的 Claude Code 里运行分析 · 支持 Hyperliquid 地址和 Robinhood CSV · 数据不离开你的电脑
          </p>
        </div>

        {/* Prerequisites */}
        <Section label="前提条件">
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)", fontFamily: '"Noto Sans SC", sans-serif' }}>
            需要安装 <strong style={{ color: "var(--text)" }}>Claude Code CLI</strong>（即 <code style={{ background: "#1A1A1A", color: "var(--gold)", padding: "1px 6px", ...MONO, fontSize: "0.75rem" }}>claude</code> 命令）。
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)", ...MONO }}>
            // 参考 docs.anthropic.com/claude-code 安装
          </p>
        </Section>

        {/* Setup */}
        <Section label="一次性配置">
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: '"Noto Sans SC", sans-serif' }}>
            克隆仓库，把 skill 文件和脚本复制到你的 Claude Code 项目：
          </p>
          <CodeBlock>{`# 克隆仓库
git clone https://github.com/bulsico/lai-shi-lu.git
cd lai-shi-lu
pnpm install

# 复制到你的项目
cp .claude/commands/trade-roast.md  你的项目/.claude/commands/
cp -r scripts/                       你的项目/scripts/
cp context/market-context.md         你的项目/context/`}</CodeBlock>
          <p className="text-xs mt-3" style={{ color: "var(--text-dim)", ...MONO }}>
            // 如果你没有现成的 Claude Code 项目，也可以直接在克隆的目录里运行
          </p>
        </Section>

        {/* Usage */}
        <Section label="使用方法">
          <div className="space-y-4">
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-dim)", ...MONO }}>
                // 分析 Hyperliquid 地址
              </p>
              <CodeBlock>{`/trade-roast 0x你的HL地址`}</CodeBlock>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-dim)", ...MONO }}>
                // 分析 Robinhood CSV（单文件）
              </p>
              <CodeBlock>{`/trade-roast --rh robinhood导出.csv`}</CodeBlock>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-dim)", ...MONO }}>
                // 合并多个 Robinhood CSV（自动去重）
              </p>
              <CodeBlock>{`/trade-roast --rh 2020-2022.csv 2022-2024.csv 2024-2025.csv`}</CodeBlock>
            </div>
          </div>
        </Section>

        {/* Robinhood export */}
        <Section label="Robinhood CSV 导出方式">
          <div
            className="p-4"
            style={{
              background: "var(--bg-card)",
              borderLeft: "3px solid var(--border-bright)",
            }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)", fontFamily: '"Noto Sans SC", sans-serif' }}>
              股票 / 期权
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: '"Noto Sans SC", sans-serif' }}>
              Account → Report → Generate Report
            </p>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)", fontFamily: '"Noto Sans SC", sans-serif' }}>
              加密货币
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: '"Noto Sans SC", sans-serif' }}>
              需要联系人工客服索取 CSV，目前 Report 功能不支持 crypto 导出。
            </p>
          </div>
        </Section>

        {/* Notes */}
        <Section label="注意事项">
          <ul className="space-y-2">
            {[
              "HL API 每个地址最多返回约 10,000 条成交记录",
              "成交少于 10 笔 / 历史少于 3 天的地址不会生成报告",
              "报告保存到 data/reports/ 目录，纯 Markdown 格式",
              "仅供娱乐，不构成投资建议",
            ].map((note) => (
              <li
                key={note}
                className="text-xs flex gap-2"
                style={{ color: "var(--text-dim)", ...MONO }}
              >
                <span style={{ color: "var(--border-bright)" }}>—</span>
                {note}
              </li>
            ))}
          </ul>
        </Section>

        {/* Source */}
        <div
          className="mt-6 pt-6 border-t flex items-center justify-between flex-wrap gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-dim)", ...MONO }}>
            // MIT License · 随便用，随便改，随便部署
          </span>
          <a
            href="https://github.com/bulsico/lai-shi-lu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)", ...MONO }}
          >
            GITHUB ↗
          </a>
        </div>
      </div>
    </main>
  );
}
