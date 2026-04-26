# 交易来时路 — Project Plan

> 用AI蒸馏你的交易历史，回望你走过的每一步

**Chinese name:** 交易来时路
**Repo slug:** `lai-shi-lu`
**Tagline:** 你以为你在交易，其实你在走一条早就写好的路

---

## Concept

People trade, lose money, and repeat the same mistakes. This tool takes your raw trade history and generates a brutally honest, deeply funny Chinese-language report that names your patterns, assigns you a trader personality type, and tells you exactly what you did wrong — in the vocabulary of Chinese internet culture.

**Target audiences:**
- Twitter: Chinese crypto traders who use Hyperliquid
- 小红书: Chinese Robinhood users (stocks + crypto)

**Core message:** AI is taking your job. At least protect your portfolio by not repeating the same mistakes. Look back at the road your trades took — and don't walk it again.

---

## Two Products

### Product 1: Hosted Web App

Anyone can paste a Hyperliquid wallet address and get a report. No signup, no data stored, no RH CSV needed (wallet addresses are already public on-chain).

- Input: HL wallet address
- Output: streaming Chinese roast report in the browser
- Share button: pre-formatted text for Twitter and 小红书
- Stack: Next.js 15 App Router, Tailwind CSS, Claude API (streaming)
- Backend: fetch HL fills from public API → compute stats → stream Claude report

### Product 2: Portable Skill

For users who don't want to paste their Robinhood CSV into a stranger's website. They copy two things into their own Claude Code session (or any AI coding session) and run the analysis locally. Data never leaves their machine.

- Supports: HL address, Robinhood stocks CSV, Robinhood crypto CSV
- Privacy pitch: "你的CSV永远不会离开你的电脑"
- Two files to copy: one skill command file + one scripts folder
- Works in Claude Code or any AI coding session with file access

---

## Report Format

The report is in Chinese, using 中文网络流行语. Structure:

```
🪞 交易照妖镜报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 基本档案
地址 / 账户: ...
分析周期: 2024年6月 → 2026年4月 (22个月)
总成交笔数: 3,728笔

💸 财务账单（残酷数字，不打折）
实现盈亏:     -$231,751
手续费:        -$1,779
亏损总结:      你是在给交易所打工

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 交易员MBTI人格测评
━━━━━━━━━━━━━━━━━━━━━━━━━━━

类型: FOMO-P型
副标题: 「情绪驱动 · 左侧接刀 · 永不止损 · 死握到底」

五维评分:
  持仓耐心     ████░░░░░░  4/10  (拿得住涨，拿不住跌)
  FOMO抵抗力   ██░░░░░░░░  2/10  (见泵就追，见跌就跑)
  止损纪律     █░░░░░░░░░  1/10  (什么叫止损？)
  趋势感知     ████████░░  8/10  (你知道方向，就是不执行)
  越挫越勇     ████░░░░░░  4/10  (每次都说下次注意)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 年度亏损三冠王
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥇 金牌亏损 · BERA · -$153,730
「一个字：夯。拿着死不撤，直到被抬出去。
  死亡交叉已经拉了3个月，你还在补仓。
  这不是投资，这是殉道。」

🥈 银牌亏损 · ENA · -$88,745
「一路持有从$0.9跌到$0.19，期间补了N次仓。
  看对了项目，但没算到'一直跌'也是一种走势。」

🥉 铜牌亏损 · BTC · -$88,048
「买在牛市顶，卖在熊市底。
  教科书级别的反向操作大师。」

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 致命弱点解密
━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 弱点一：左侧接刀综合征
...（具体data支撑）

❌ 弱点二：情绪化过度交易
...（1月1283笔之类的）

❌ 弱点三：跨账户自相矛盾
...（股票赚的全亏在链上）

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 交易员等级认定
━━━━━━━━━━━━━━━━━━━━━━━━━━━

S级  传奇交易员   胜率>55% & 持续盈利 & 懂止损
A级  稳健老手     胜率>50% & 基本打平 & 有纪律
B级  有潜力新人   接近50%胜率，偶有爆仓
C级  反向指标     ← 你大概在这里
D级  纯韭菜       胜率<40%，重复同样的错
F级  建议转行     亏损率>80%，请认真考虑人生方向

本次评级: C级「有潜力的反向指标」
理由: 股票有edge，但crypto把你打回原形。

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 来自AI的灵魂拷问
━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI在抢你的工作，但至少AI不会被BERA夯$15万。

三件事做到，成绩单会好看很多:
1. ...
2. ...
3. ...

下次你想开新仓，先问自己：
「我是在交易，还是在赌气？」
```

---

## Trader Personality Types (~12 Archetypes)

The AI picks the closest match based on computed stats. One primary type + optional modifier.

| Type | 名称 | Trigger Conditions |
|------|------|--------------------|
| `FOMO-P` | FOMO型狙击手 | Win rate drops after big pumps; avg entry is near local high |
| `KNIFE-CATCHER` | 左侧接刀殉道者 | Avg loss trade has 3+ adds before close; largest losses are multi-add positions |
| `OVERTRADE` | 过度交易内耗型 | >20 fills/day at peak; fees >5% of gross P&L |
| `DIAMOND-HANDS` | 钻石手候鸟 | Avg hold time on losers 5x longer than winners; few sells |
| `CRYPTO-CONFUSED` | 股票清醒加密迷糊型 | RH stocks/options net positive; HL/RH crypto net negative |
| `TREND-MASTER` | 右侧交易大师 | Win rate >55%; avg winner > avg loser; low liquidation count |
| `SCATTER-GUN` | 机枪扫射型 | >30 unique assets traded; no single asset >20% of volume |
| `TUITION-PAYER` | 学费缴纳优等生 | Net negative overall but win rate improving QoQ |
| `BOTTOM-MISS` | 抄底专家（错的那种）| Pattern of buys within 5% of local low followed by continued decline |
| `PANIC-SELL` | 情绪化清仓机 | Multiple large sells within 24h of drawdown; then re-buys higher |
| `WHALE-SERVANT` | 主力资金搬运工 | Sells before pumps, buys before dumps (detectable via fill timing vs price action) |
| `COMEBACK-KID` | 逆势翻身王 (rare) | Historically bad stats but last 3 months strongly positive and improving |

**Modifier tags** (appended to primary type):
- `·补仓上瘾` — adds to losing positions >50% of the time
- `·止损恐惧症` — average loss is >3x average win
- `·假突破受害者` — high loss rate on breakout trades
- `·右侧觉醒中` — stats improving, on the right track

---

## Slang Vocabulary Reference

Words and phrases the report prompt should use naturally:

| Slang | Meaning / When to use |
|-------|----------------------|
| 夯 | 被套牢/亏大了，e.g. "被BERA夯了$15万" |
| 拉平级 | 已经到极限了，"这操作已经拉平级了" |
| 寄了 | 完蛋了，"这仓位寄了" |
| 麻了 | 麻木了/无语了，"看到这个盈亏我麻了" |
| 绷不住了 | 忍不住了/撑不住了 |
| 破防了 | 被击穿心理防线 |
| 芭比Q了 | 完蛋了（更口语），同"寄了" |
| 遥遥领先 | 讽刺用法，"在亏损排行榜上遥遥领先" |
| 顶流 | 最厉害的，"亏损界顶流" |
| 炸裂 | 非常夸张，"这胜率炸裂" |
| 狠人 | 敢于极端操作，"你是狠人" |
| 抽象 | 操作太迷，"这操作太抽象了" |
| 下头 | 令人失望/反感 |
| 整活 | 搞事情/玩梗 |
| 上头 | 冲动/被情绪控制，"你上头了" |
| 赢麻了/亏麻了 | 赢/亏到麻木 |
| 教科书级别 | 经典案例，褒贬皆可 |
| 人上人 | 讽刺，"在韭菜里也算人上人了" |
| 草台班子 | 很混乱/不专业的操作 |
| 开盒 | 把你的操作公开解剖 |

---

## Tech Stack

### Web App (`/web`)

```
Next.js 15 (App Router)
Tailwind CSS
shadcn/ui (minimal — just for input + card components)
Claude API (claude-haiku-4-5 for cost, streaming)
No database — stateless, generate on demand
Optional: in-memory cache (Map) for 1 hour per address
```

**API flow:**
1. `POST /api/analyze` receives HL address
2. Fetches all fills from `https://api.hyperliquid.xyz/info` (paginated, no auth)
3. Computes stats in-process (P&L by asset, win rate, patterns, archetype match)
4. Streams Claude prompt → response back to client via SSE
5. Client renders streaming markdown

**No database needed.** Addresses are public. Reports are ephemeral. If the same address is requested twice within an hour, return cached result.

### Portable Skill (`/skill`)

```
commands/trade-roast.md   — Claude Code skill file
scripts/fetch-hl.ts       — fetch fills for any HL address (no auth)
scripts/parse-rh.ts       — parse Robinhood stocks + crypto CSV
scripts/analyze.ts        — compute stats, output JSON summary
package.json              — minimal: just tsx + zod
```

**User flow:**
1. Copy `commands/trade-roast.md` → their `.claude/commands/`
2. Copy `scripts/` → their project root
3. Run `/trade-roast 0x123...` or `/trade-roast --rh ./trades.csv`
4. Skill runs `tsx scripts/fetch-hl.ts 0x123...` → `data/raw-fills.json`
5. Skill runs `tsx scripts/analyze.ts` → `data/summary.json`
6. Skill reads `summary.json` and generates the fun Chinese report

---

## Repository Structure

```
lai-shi-lu/
├── web/                          # Hosted Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page (address input + example)
│   │   │   ├── report/
│   │   │   │   └── page.tsx      # Streaming report display
│   │   │   └── api/
│   │   │       └── analyze/
│   │   │           └── route.ts  # Core: fetch HL → compute → stream Claude
│   │   └── lib/
│   │       ├── fetch-hl.ts       # HL API client (paginated fills)
│   │       ├── compute-stats.ts  # P&L, win rates, patterns, archetype scoring
│   │       └── report-prompt.ts  # The fun Chinese prompt template
│   ├── package.json
│   └── .env.example              # ANTHROPIC_API_KEY
│
├── skill/                        # Portable version
│   ├── commands/
│   │   └── trade-roast.md        # Drop into .claude/commands/
│   └── scripts/
│       ├── fetch-hl.ts           # Fetch HL fills → JSON
│       ├── parse-rh.ts           # Parse RH CSV → JSON
│       └── analyze.ts            # Compute stats → summary JSON
│
└── README.md
```

**Note:** `fetch-hl.ts` and `compute-stats.ts` core logic is shared between web and skill. The web version bundles it in `src/lib/`. The skill version has standalone copies in `scripts/` so users only need to copy one folder.

---

## Compute Stats Spec

What `compute-stats.ts` / `analyze.ts` must produce before the report can be generated. This is pure math, no AI involved.

```typescript
interface TradeSummary {
  address: string
  period: { from: string; to: string; days: number }
  
  // Basic stats
  totalFills: number
  uniqueAssets: number
  totalRealizedPnl: number   // USD
  totalFees: number          // USD
  netPnl: number             // realized - fees
  winRate: number            // 0–1
  avgWin: number             // USD
  avgLoss: number            // USD
  liquidations: number
  
  // Pattern detection (inputs for archetype scoring)
  avgFillsPerDay: number
  peakFillsInOneDay: number
  avgLoserHoldTime: number   // hours (if fill timestamps allow)
  avgWinnerHoldTime: number  // hours
  addedToLoserRate: number   // % of losing positions that got adds
  
  // Asset breakdown
  byAsset: Array<{
    asset: string
    netPnl: number
    fills: number
    winRate: number
    avgWin: number
    avgLoss: number
    biggestWin: number
    biggestLoss: number
  }>
  
  // Time breakdown
  byMonth: Array<{
    month: string     // YYYY-MM
    netPnl: number
    fills: number
    cumulative: number
  }>
  
  // Top trades
  worstTrades: TradeResult[]   // top 5 by loss
  bestTrades: TradeResult[]    // top 5 by gain
  
  // Archetype scores (0–100, higher = more of this type)
  archetypeScores: {
    fomoTrader: number
    knifeCatcher: number
    overtrader: number
    diamondHands: number
    scatterGun: number
    panicSeller: number
    trendFollower: number
  }
  
  // Derived ratings (0–10, for the five radar bars)
  ratings: {
    patience: number
    fomoResistance: number
    stopLossDiscipline: number
    trendAwareness: number
    resilience: number
  }
}
```

The archetype and ratings are computed deterministically from the stats, not by AI. The AI prompt then receives this structured summary and writes the narrative around it. This keeps the report accurate (grounded in real numbers) while letting Claude handle the fun language.

---

## The Report Prompt (Design)

The prompt sent to Claude receives the full `TradeSummary` JSON and is instructed to:

1. **Write entirely in Chinese** using 网络流行语 naturally (not forced)
2. **Use the pre-computed archetype and ratings** — don't invent new numbers
3. **Name specific assets and amounts** — no vague language, real callouts
4. **Alternate between brutal honesty and self-aware humor** — the tone is a friend who loves you but won't lie to you
5. **End with 3 specific, actionable suggestions** grounded in the actual data
6. **Never use English** except for asset names (BTC, ETH, BERA etc.) and dollar amounts

**Tone reference:** 小红书复盘贴 meets 虎扑球迷锐评 meets 网络段子手 — opinionated, vivid, data-backed.

---

## Open Source & Distribution

### README structure

Two separate sections for the two audiences:

**Section A — "我就想看看我的HL钱包" (just use the website)**
- Link to hosted site
- One sentence: paste your address, get roasted

**Section B — "我不想把我的隐私交给陌生人" (self-hosted / portable skill)**
- Step 1: Install Claude Code (link)
- Step 2: Copy two files
- Step 3: Run one command
- Privacy guarantee: data never leaves your machine

**Section C — "我想自己部署" (self-host the web app)**
- `git clone` → `ANTHROPIC_API_KEY=xxx pnpm dev`
- One-click Vercel deploy button

### Social content ideas

**Twitter (crypto audience):**
```
刚用AI分析了我的HL交易历史

结论：我是「左侧接刀殉道者」
BERA夯了我$153K，不是因为运气不好
是因为我在死亡交叉后还补了仓

开源工具，填你的地址就能出报告
交易来时路 → [link]
```

**小红书 (stock/crypto audience):**
```
📊 AI帮我分析了我在Robinhood的交易历史

我的交易员类型：「股票清醒加密迷糊型」
股票+期权：+$15万 ✅
加密货币：-$23万 ❌

净亏损，完全被crypto吃掉了
工具是开源的，私信我或者去GitHub
（只需要你导出的CSV，数据不上传任何服务器）
```

---

## Implementation Phases

### Phase 1 — Core Data Layer (no AI yet)
- `fetch-hl.ts`: fetch all fills for any address, paginated, output raw JSON
- `compute-stats.ts`: P&L by asset, win rate, pattern stats, archetype scoring
- Unit test with a known address to verify numbers match manual calculation

### Phase 2 — The Report Prompt
- Write the Chinese prompt template with all 12 archetypes
- Test with real TradeSummary JSON, iterate on tone and accuracy
- Nail the slang usage — should feel natural, not cringe

### Phase 3 — Portable Skill
- `trade-roast.md` skill file (orchestrates: run scripts → read JSON → generate report)
- `parse-rh.ts` for Robinhood CSV (adapt from existing process-trades.ts logic)
- Test end-to-end with a real HL address and a real RH CSV
- Write the `skill/README.md` for copy-paste instructions

### Phase 4 — Web App
- Next.js skeleton with address input form
- API route: fetch + compute + stream Claude
- Streaming UI (typewriter effect for report output)
- Share button (formats key stats + type for Twitter/XHS)
- Landing page copy and meme energy

### Phase 5 — Polish & Launch
- Add 2–3 example reports on the landing page (real or anonymized)
- 小红书-style card export (screenshot-friendly format)
- README final pass for both audiences
- Twitter thread + 小红书 post draft

---

## Open Questions

1. **Hosting:** Where does the web app live? Vercel is easiest. Needs `ANTHROPIC_API_KEY` env var. Cost is ~$0.01–0.05 per report with Haiku.

ill host it on my exe.dev vps so i can use my existing claude subscription just like time-to-get-serious use claude code cli -p. and i can use sonnet with high effort, if we get too popular, ill move it to vercel and buy api.

2. **Rate limiting:** Without auth, the site could be abused. Options:
   - Simple: in-memory rate limit (5 requests/IP/hour) — fine for launch
   - Better: Cloudflare Turnstile (free CAPTCHA)
   - Skip for now: if it goes viral we can add it

skip for now, let's just add a simple db that store the hl address - report, if the address is already generated, we show the report (unless it's more than 1 day old then we allow regenerate), this way we can show stats (how many user tried and how many reports generated) on ui

3. **RH support in web app:** Currently scoped to HL only for the hosted version (privacy). Should the web app ever support RH CSV upload? Probably not — the skill version covers this use case cleanly.

no, ui should be minimal and only support hl, upload csv is too much, on the ui we can direct rh users to skill 

4. **Report language toggle:** Chinese only for now? Or add English toggle for broader reach? Start Chinese-only, add English later if demand exists.

chinese only now

5. **Analytics:** Do we want to track which archetypes are most common? Interesting for a follow-up tweet ("60% of HL traders are knife-catchers"). Would need a DB. Skip for v1.

we can scope it in given we already decide to include a db to track all web users

6. **HL data depth:** For the web app, we only have fills (no open positions, no real-time prices). This means the report covers realized P&L only — no unrealized. Fine for v1. Could add a note: "Open positions not shown. For full analysis including unrealized P&L, use the portable skill."

yes sounds good.

## my comments

- should we just use the same skill in web analysis as well? so only 1 skill (or skill + script) needed
- 交易照妖镜 这个名字登味有点重 能不能起个年轻好玩的名字
- hl api only has recent 10k fills, enough for most users but not for heavy traders, note that, please study the trade-review skill in time-to-get-serious very very very careful, it has all the caveats
- 你可能要先网上查下从夯到拉是怎么用的
- the report should be fancy and pretty! make it something you want to share on social with your friend! 

that's my comment so far, lmk if you have any question
