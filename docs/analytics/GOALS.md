**相关文档**:
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## 目标

这里记录 OpenToggl 在**流量来源分析 / SEO / GEO（Generative Engine Optimization）** 上需要满足的目标。
按目标组织，不写具体工具选择，不把当前已接入（Ahrefs Web Analytics、update-worker Analytics Engine）误当成目标。

---

## 范围（2026-04-18 收口）

本阶段**唯一主目标**是为 landing 站 `opentoggl.com` 建立点击归因与 GEO 可观测性。
其他目标保留在文档里，但显式标记为 `optional` 或 `deferred`，本阶段不投入工程量：

- `required`：landing 自身的 pageview / outbound click / SEO / GEO
- `optional`：GitHub 位置级归因（UTM 对 GitHub 无效，不建 `/go/:target` Worker；仅靠 GitHub Traffic Insights 的域名级 referrer）
- `deferred`：demo 站 `track.opentoggl.com` 的归因（demo 需登录才能用，匿名 first-visit 归因需要单独设计匿名会话模型，不在本阶段范围）
- `deferred`：自托管实例的 `install_source` 回传（需改 install 脚本 + update-worker schema，样本还太少，等有 landing 端数据后再说）

详见 [DECISION.md](DECISION.md) 的决策背景。

---

## 背景：OpenToggl 的三块面

OpenToggl 对外流量主要落在三个入口：

- **Landing**：`opentoggl.com`（React Router SSR，apps/landing）
- **Demo / App**：`track.opentoggl.com`（apps/website，SPA，`robots: noindex`）
- **GitHub repo**：`github.com/CorrectRoadH/opentoggl`（开源项目主页）

此外：

- `apps/update-worker` 已经用 Cloudflare Analytics Engine 做**安装/版本心跳**统计（instance_id / version / os / arch / country）。属于"自部署实例运行情况"，和"web 端流量归因"是两个独立问题。
- `apps/landing` 已接入 Ahrefs Web Analytics（`analytics.ahrefs.com/analytics.js`）。
- Landing 的外链已通过 `appendUtm` 给 GitHub / demo 链接加上 `utm_source=opentoggl_landing` 等参数。

本目标文档只关心 **web 流量归因 + 搜索/AI 曝光**，不讨论产品内事件。

---

## 已触发的痛点

### UTM 挂到 GitHub 外链基本拿不回归因

`home.tsx` 里给 `https://github.com/...?utm_source=opentoggl_landing&utm_medium=proof_card&...` 这类外链加了 UTM，但：

- GitHub 不会把这些 UTM 喂给我们的 Ahrefs；GitHub 自己的 Traffic Insights 也只按 referrer 域名聚合，看不到 `utm_medium=hero_cta` 与 `utm_medium=proof_card` 的差别
- 结果：目前"来自 opentoggl landing 的 GitHub 点击"只能拿到一个总数（referrer = opentoggl.com），区分不了 hero、footer、proof card 哪个位置最有效
- UTM 污染 URL，可能降低点击意愿，却换不回数据

### landing 与 demo 之间的归因断点

- 一个用户从 Google 搜索进 `opentoggl.com/zh`，点 hero CTA 跳到 `track.opentoggl.com`，这中间的归因要能穿透
- 目前 `track.opentoggl.com` 是 `noindex` SPA，没接任何 web analytics，也没读 landing 传过来的 UTM 并落盘
- 结果：看不到"有多少搜索来的用户最终真的进了 demo"这类转化

### SEO 数据缺少落地页级别拆解

- Ahrefs 已覆盖排名/backlink，但 Google Search Console / Bing Webmaster 没有系统化接入
- 没人定期回答"哪些 query 在带 landing 流量、哪些页面在涨/跌、哪些 locale 的 landing 有曝光但没点击"这类 SEO 问题
- 多语言 landing（en/zh/es/ja/fr/ko/pl/pt）之间的 SEO 表现没有拆分视角

### GEO 曝光没有系统化跟踪

- 越来越多用户通过 ChatGPT / Perplexity / Claude / Google AI Overview 发现开源工具
- 目前我们**完全不知道** OpenToggl 在这些 AI 答案里被不被提到、被什么 query 触发、提到时被如何描述
- 没有 GEO 数据，就无法判断"写技术博客、补文档、上 awesome-list"这些动作对 AI 曝光的真实影响

---

## 需求

### GitHub 流量来源要能按入口区分（optional）

- 理想状态：回答"哪个站内位置最有效地把人送到 GitHub"（hero CTA vs proof card vs footer vs docs 内链）
- 理想状态：区分"来自 landing 之外的 GitHub 访问"（HN、Twitter、中文社区、其他开源项目引用）
- **当前接受的下限**：GitHub 本身的 Insights > Traffic 只按 referrer 域名聚合、仅留 14 天；这是现状能拿到的上限
- **为什么是 optional**：UTM 挂到 github.com 外链对 GitHub 无效，要拿到位置级数据必须自建 `/go/:target` 中转 Worker；本阶段评估 ROI 偏低，暂不做

### landing 自身的流量来源要有系统化视角（required）

- 每天从各渠道（organic / referral / social / AI / direct）进 landing 的分布
- landing 内部外链点击的去向与数量（按 target 聚合：demo / github / x / docs 等）
- 数据要能按 **locale × source × landing page** 三维拆分，不只是总量
- 这一层必须闭环，是本阶段的核心产出

### landing → demo 的跨域归因（deferred）

- 理想状态：landing / demo 两个域名之间的跳转能串成一次 session（visitor id 或 utm 透传）
- 理想状态：回答"landing 到 demo 的点击率"，以及"demo 的 first visit 中有多少来自已知 landing campaign"
- **为什么 deferred**：`track.opentoggl.com` 需登录才能用，demo 侧没有匿名用户会话，`first_visit` 要和"登录前访问 → 登录"两段跨会话关联，需要单独设计匿名 visitor 模型与合并策略。等 landing 端数据先证明 landing→demo 是关键路径再启动

### SEO 数据要闭环（required）

- 系统化接入 Google Search Console（GSC）和 Bing Webmaster Tools
- 能回答：
  - 每个 locale landing 的曝光/点击/CTR/平均排名
  - 涨/跌的 query 与 page（周粒度趋势）
  - 有曝光无点击的 query（title/description 优化线索）
  - 哪些外链/站点正在给 OpenToggl 带流量（Ahrefs 已覆盖，需要和 GSC 交叉）
- 多语言页面的 hreflang、canonical、结构化数据要可审计（已生成 WebSite / Organization / FAQ schema，这部分需纳入 SEO 报表）

### GEO 曝光要可观测（required）

- 能回答：**OpenToggl 在 ChatGPT/Perplexity/Claude/Google AI Overview 的答案里被提到多少次、在什么 prompt 下、被如何描述**
- 能回答：**竞品（Toggl Track、Clockify、Harvest、Timely）在相同 prompt 下的 Share of Voice**
- 能识别"AI 引用但没带链接" vs "AI 引用且带 github/landing 链接"
- 数据要能指导动作：补哪篇文档、发哪类技术文章、上哪类 awesome-list 能提高 GEO 命中率

### 隐私 / 开源友好

- 不引入 Google Analytics 式的 cookie 与指纹
- 数据上报必须是 1st-party 或可自托管；不把用户行为卖给广告网络
- 任何 client-side tracker 必须可在构建时禁用，方便 self-hosted 部署者不启用任何外部 analytics
- Ad blocker 对 landing 的 tracker 命中是可预期的损耗，不做 domain cloaking 绕过

### 运行成本与运维负担要低

- 新增 analytics 基建不能绑死一个需要长期手动运维的系统（DB、仪表盘、升级）
- 每周能在 15 分钟以内拿到"landing pageview 趋势 + landing 外链点击分布 + SEO 涨跌 + GEO 新提及"四张图
- 数据留存至少 12 个月，能做 YoY 对比
- 任何自建中转（例如 `/go/:target` outbound redirect）必须能做到：失败即 fail-open 直接 302 到目标 URL，不影响用户体验

### 可审阅与可版本化

- 归因相关配置（UTM 规范、outbound redirect 白名单、GSC property list、GEO 监控 prompts）必须在仓库里以文件形式存在，不是只在某个 SaaS 控制台配
- 每一次"新增一个 CTA / 新增一个 outbound target"都能在 PR 里 review 到
- 指标口径要写进 `docs/analytics/`，避免"涨了/跌了"但不知道定义改过

---

## 非目标

- **产品内部埋点 / funnel**：如 time-entry 创建失败率、calendar 拖拽完成率。这是应用遥测问题，不在本文档范围。
- **用户画像 / CRM**：不构建登录态用户的长期画像。
- **广告投放归因**：目前不投放付费广告，last-click attribution model 不是本阶段的问题。
- **替换 Ahrefs**：Ahrefs 仍是 SEO / backlink / brand-radar 的主数据源；本文档讨论的是补齐 Ahrefs 覆盖不到的部分。
- **本阶段不做 demo (track.opentoggl.com) 的归因**：demo 需登录才能使用，匿名→登录合并策略需要独立设计；见 [DECISION.md](DECISION.md)。
- **本阶段不做自建 `/go/:target` 中转**：GitHub 位置级归因 ROI 不足以支撑新建 Worker；见 [DECISION.md](DECISION.md)。
