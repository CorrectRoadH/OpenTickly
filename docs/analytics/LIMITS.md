**相关文档**:
- [GOALS.md](GOALS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## 目的

这里记录候选流量归因 / SEO / GEO 方案的限制和边界。
按方案组织，不写目标，不写落地步骤，只写各自擅长什么、不擅长什么、会带来什么影响。

---

# 仅 UTM + 目标站 referrer（现状）

当前 landing 做的：给外链挂 UTM，指望 Ahrefs / GitHub 自动帮我们拆。

## 当前支持

- 实现成本最低，已经有 `appendUtm` 工具函数
- 对**能读 UTM 的落地页**（如 track.opentoggl.com，如果我们自己埋点）有效
- 搜索引擎通常会保留 UTM 不影响 canonical

## 限制

- **GitHub 不解析 UTM**：所有带 UTM 的 GitHub 外链，最终在 GitHub Traffic Insights 里只表现为 "referrer = opentoggl.com"，`utm_medium=hero_cta` 和 `utm_medium=proof_card` 无法区分
- GitHub Traffic Insights 只保留 14 天
- `track.opentoggl.com` 目前没接任何 analytics，UTM 进来也落不进库
- UTM 污染 URL，对某些用户可能降低点击意愿

## 直接影响

- "哪个 CTA 最有效"这个问题在现状下根本无法回答
- landing → demo 转化无从计算
- 这是当前状态的**下限**，任何方案至少要超过它

---

# 自建 `/go/:target` 点击中转 + UTM

思路：把所有对 GitHub / 外部 repo 的外链改成走我们自己的 redirect，例如 `opentoggl.com/go/github?ref=hero_cta`，服务端记一条然后 302 到目标 URL。

## 当前支持

- **GitHub 点击归因可以做到位置级别**（hero vs proof card vs footer vs 文档内某段落）
- 数据完全在我们自己手里，想留多久留多久
- fail-open：redirect 服务挂了也只是少一条埋点，不影响用户跳 GitHub
- landing 侧可以和 Ahrefs Web Analytics 的 pageview 数据 join
- 不依赖 client JS（即使 ad blocker 也能命中，因为是服务端 302）

## 限制

- 需要维护一张 `outbound_targets` 白名单（否则变成 open redirect，被钓鱼滥用）
- 需要一个能写日志的 serverless 端点（Cloudflare Worker / Zeabur service）
- 多一跳，极少数安全软件可能会警告中转域名
- 只解决"我们站内点出去"的部分，**不解决**"外部直达 GitHub"的归因——那部分永远只能靠 GitHub Insights
- 需要 landing 所有外链 helper 统一切换，不能有漏网

## 直接影响

- 以较小工程量换到本来拿不到的 GitHub CTA 位置级数据
- 引入一个长期需要维护的 outbound service 和白名单

---

# Ahrefs Web Analytics（已接入）+ outbound events

landing 已经在 `root.tsx` 加载 `analytics.ahrefs.com/analytics.js`。Ahrefs 自带 outbound link 和 custom event 能力。

## 当前支持

- pageview / referrer / country / device 零成本拿到
- 和 Ahrefs 自身的 Rank Tracker / Backlinks / Brand Radar 同一个控制台，看 SEO 不用切工具
- 可以通过 Ahrefs MCP 在本文档生成的工作流里直接拉报表（`mcp__claude_ai_Ahrefs__web-analytics-*`）
- 给 outbound 链接打 `data-ahrefs-event` 或调 JS API 可以记点击事件

## 限制

- Ad blocker 会拦 `analytics.ahrefs.com`，命中率大约在 70-85%（开源 dev 受众里损耗会更大）
- 是 3rd-party script，与"隐私 / 开源友好"目标有轻微冲突；需要在构建开关里允许 self-hosted 部署不加载
- 依赖 Ahrefs 订阅；订阅停掉数据就没了
- 对 GEO（AI 答案曝光）本身没有原生支持——要用 Ahrefs Brand Radar 独立产品

## 直接影响

- 覆盖 landing / demo pageview + outbound click 的 80% 诉求
- 留给自建基础设施的只剩"GitHub 外链位置级数据想长期留存 / 独立于 Ahrefs 订阅"这一块——用 `/go/:target` 补

---

# Plausible 自托管

开源、cookie-less、1st-party 域名上报的 web analytics。

## 当前支持

- 完全自托管，数据在自己库里
- 1st-party 域名（`plausible.opentoggl.com/event`）可绕过大部分 ad blocker
- 有官方的 outbound link、file download、custom event 支持
- GDPR 友好，不需要 cookie banner
- GSC integration 内置，可以在同一界面看 SEO query / page / 曝光

## 限制

- 自托管需要 ClickHouse + PostgreSQL + Plausible app 三组件，运维成本非零
- 有 managed 版本，但那又回到了 "数据在第三方"
- 对 GEO / AI 答案监控完全不覆盖
- 与当前已接入的 Ahrefs 形成功能重叠，要决定谁是真相源

## 直接影响

- 和 Ahrefs Web Analytics 选一个；不值得同时跑
- 如果选它，可以把 Ahrefs 降级为纯 SEO/backlink 工具

---

# PostHog 自托管

产品分析平台，事件模型 + session replay + feature flag + funnel。

## 当前支持

- 最完整的事件/用户/漏斗能力
- landing → demo 跨域可以串 session
- 能做 cohort、retention、reverse funnel 分析
- 自托管可控

## 限制

- **过重**：我们在 GOALS 里明确不做产品内埋点，PostHog 大部分能力会闲置
- 自托管依赖 ClickHouse + Kafka + Postgres + Redis，运维负担比 Plausible 大一个量级
- Cookie + localStorage，不符合"隐私 / 开源友好"目标
- Session replay 对开源项目的 landing 意义不大

## 直接影响

- 除非我们决定**同时**做产品内埋点，否则 PostHog 是杀鸡用牛刀
- 本阶段不推荐

---

# Google Search Console / Bing Webmaster Tools

搜索引擎官方提供的曝光 / 点击 / query 数据源。

## 当前支持

- 唯一权威的 "我的页面在 Google/Bing 上的真实表现" 数据源
- 免费、长期留存（GSC 16 个月）
- 能按 query / page / country / device 拆
- Ahrefs MCP 已经有 `gsc-*` 工具，可以直接拉数据

## 限制

- GSC 数据是聚合+采样的，低频 query 不会出现
- 需要先完成站点所有权验证（DNS TXT 或 HTML meta）
- 对 GEO（ChatGPT/Perplexity 答案曝光）完全无覆盖
- 不告诉你 "有点击但没转化" 的用户后续行为——要和 web analytics join

## 直接影响

- SEO 目标 无此接入基本做不到闭环
- 必须接，但只解决 SEO 一块，不覆盖 outbound 归因和 GEO

---

# Ahrefs Brand Radar（GEO 专用）

Ahrefs 的 AI Overview / ChatGPT / Perplexity 曝光追踪产品。

## 当前支持

- 能监控指定 prompts 在 AI 答案里的 mention / citation 数据
- 能看 cited domains / cited pages，识别 AI 是在引用谁的内容来提到 OpenToggl
- 支持 share of voice（竞品对比）
- 有 Ahrefs MCP 工具：`brand-radar-ai-responses / cited-domains / mentions-history / sov-*`

## 限制

- 需要你手工配置"要监控哪些 prompts"——prompts 选不好，数据就没信号
- 依赖 Ahrefs 订阅层级是否包含 Brand Radar
- 只覆盖公开可访问的 AI 平台，ChatGPT/Claude 个人订阅里的私有对话不可见
- 不是实时：prompt 执行是定时批次

## 直接影响

- 是本阶段做 GEO 最现实的路径；自建 "每天跑一批 prompt 到 GPT/Claude/Perplexity" 虽然可行但工程量大、API 成本也不低
- 代价是 prompt 库要持续维护，否则数据会漂成 "只盯住 5 年前的 query"

---

# 自建 GEO 监控（LLM API 轮询）

自己写 cron，每天用一批固定 prompt 调 OpenAI / Anthropic / Perplexity API，解析答案里是否出现 OpenToggl 及竞品。

## 当前支持

- 完全控制 prompt 列表、频率、解析规则
- 可以监控 Brand Radar 不覆盖的平台（如内部部署的 Claude）
- 数据结构自定义，方便和内部 SEO 报表 join

## 限制

- 需要长期维护 prompt 库、答案解析器、幻觉处理、API 成本
- API 返回的答案不等于真实用户看到的答案（A/B、个性化、RAG 都会造成差异）
- 短期内仍需要人工校准"被提到"的判定规则
- 和 Ahrefs Brand Radar 高度重叠，除非后者无法满足

## 直接影响

- 短期不推荐：工程量大、产出不确定
- 长期如果 Brand Radar 被卡在订阅或覆盖面上，可作为补充
