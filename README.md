# 交易来时路

> 用AI蒸馏你的交易历史，回望你走过的每一步

AI 帮你把 Hyperliquid 交易记录分析成一份中文「交易人格报告」——用网络流行语，MBTI风格人格评测，毒舌但准确，数据说话。

**目标用户：** 中文加密交易社区（Twitter）和 Robinhood 用户（小红书）

---

## 两种用法

### 方式一：直接用网站（只需要 HL 地址）

直接访问网站，粘贴你的 Hyperliquid 钱包地址，等 30-60 秒，获取专属报告。

**你的地址是公开链上数据，无需任何签名或授权。**

---

### 方式二：本地运行（Robinhood CSV / 不想上传数据）

适合不想把数据交给陌生网站的用户。你的 CSV 文件**永远不会离开你的电脑**。

需要：[Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

```bash
# 1. 克隆仓库
git clone https://github.com/bulsico/lai-shi-lu.git
cd lai-shi-lu

# 2. 安装依赖
pnpm install

# 3. 把 skill 文件复制到你的 Claude Code 项目
#    （如果你已经有 Claude Code 项目，把下面两个东西复制过去）
cp -r .claude/commands/trade-roast.md  你的项目/.claude/commands/
cp -r scripts/                         你的项目/scripts/
cp context/market-context.md          你的项目/context/

# 4. 运行（在你的 Claude Code 会话里）
/trade-roast 0x你的HL地址

# 或者分析 Robinhood CSV
/trade-roast --rh 你的项目/你的robinhood导出.csv
```

**如何从 Robinhood 导出 CSV：**

- 股票/期权：Account → Report → Generate Report
- 加密货币：有点智障，需要找人工客服要csv，因为现在report只能生成individual或者retirement，crypto不支持

---

## 报告样例

```
🪞 交易来时路 · 你的交易档案

📋 基本档案
分析周期: 2024年6月 → 2026年4月 (660 天)
总成交笔数: 3,728 笔 · 资产数: 47 个

💸 财务账单（残酷数字，不打折）
净盈亏:    -$231,751
胜率:       45.0%

🧬 交易员类型: 左侧接刀殉道者·止损恐惧症
「你不是不知道该止损，你只是每次都觉得'再等等'。
  这份等待，价格昂贵。」

五维评分:
  持仓耐心     ████░░░░░░  4/10
  FOMO抵抗力   ██░░░░░░░░  2/10
  止损纪律     █░░░░░░░░░  1/10
  趋势感知     ████████░░  8/10
  越挫越勇     ████░░░░░░  4/10

📊 评级: C级「有潜力的反向指标」
```

---

## 自己部署网站

```bash
git clone https://github.com/bulsico/lai-shi-lu.git
cd lai-shi-lu
pnpm install

# 配置数据库
cp .env.example .env
pnpm prisma db push

# 开发模式
pnpm dev

# 生产部署（需要 Claude Code CLI 已安装）
pnpm build && pnpm start
```

**环境变量：**

| 变量           | 说明                              |
| -------------- | --------------------------------- |
| `DATABASE_URL` | SQLite 路径，默认 `file:./dev.db` |

网站使用你本地安装的 Claude Code CLI（`claude -p`）生成报告，无需购买 Anthropic API。

---

## 项目结构

```
lai-shi-lu/
├── scripts/
│   ├── fetch-hl.ts        # 抓取 HL 成交记录（公开 API，无需授权）
│   ├── analyze.ts         # 计算统计数据、人格评分、等级
│   └── parse-rh.ts        # 解析 Robinhood CSV（本地运行，数据不上传）
├── .claude/commands/
│   └── trade-roast.md     # Claude Code skill 文件
├── context/
│   └── market-context.md  # 2023–2026 市场背景参考（AI 分析时用作上下文）
├── src/                   # Next.js 网站
│   ├── app/               # 页面和 API 路由
│   ├── components/        # ReportRenderer、SiteStats 等
│   └── lib/               # DB、HL 客户端、统计引擎
└── prisma/
    └── schema.prisma      # SQLite：Report + Job 表
```

---

## 交易人格类型

| 类型            | 名称           | 典型特征                         |
| --------------- | -------------- | -------------------------------- |
| `TREND_MASTER`  | 右侧交易大师   | 胜率>55%，盈利，懂止损           |
| `KNIFE_CATCHER` | 左侧接刀殉道者 | 越跌越买，平均亏损远大于平均盈利 |
| `OVERTRADE`     | 过度交易内耗型 | 日均成交>10笔，给交易所打工      |
| `SCATTER_GUN`   | 机枪扫射型     | 交易30+个资产，没有专注的edge    |
| `PANIC_TRADER`  | 情绪化清仓机   | 爆仓多，成交量波动剧烈           |
| `DIAMOND_HANDS` | 钻石手候鸟     | 很少交易，持有周期极长           |

---

## 注意事项

- HL API 每个地址最多返回约 **10,000 条**成交记录（平台限制）
- 成交少于 10 笔 / 历史少于 3 天的地址不会生成报告（数据不够无法分析）
- 网站同时处理最多 3 个分析任务，高峰期请稍等
- 同一地址的报告缓存 24 小时，之后可以重新生成
- 仅供娱乐，不构成投资建议

---

## 开源协议

MIT License — 随便用，随便改，随便部署。

---
