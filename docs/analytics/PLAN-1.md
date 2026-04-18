**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)
**决策**: [DECISION.md](DECISION.md)（当前主路径是 [PLAN-4](PLAN-4.md)；本文档是完整版参考）

---

## 实现方案 1（推荐）

### 简述

保留 Ahrefs Web Analytics 作为 landing / demo 两站的 pageview 底座，**新增一个 1st-party `/go/:target` 点击中转 Worker** 覆盖所有站外外链（GitHub 优先），**扩展 update-worker 接收 `install_source` 参数**用来把"自部署实例"的来源标签落盘，SEO 用 **Google Search Console + Bing Webmaster + Ahrefs MCP** 做周度报表，GEO 用 **Ahrefs Brand Radar** 作为主数据源、配合固定 prompt 库覆盖 ChatGPT / Gemini / Perplexity / Claude 四大平台。未解决的是"完全无 referer 的 AI 答案引用 → 实际安装"的长链路归因，需要产品内 first-run 自报来源问卷补。

---

## 企业理解摘要

- **实体**：OpenToggl（开源自托管的 Toggl Track 替代品）
- **面**：landing `opentoggl.com`（SSR，多语言 en/zh/es/ja/fr/ko/pl/pt）、demo `track.opentoggl.com`（SPA，noindex）、GitHub `github.com/CorrectRoadH/opentoggl`、未来 docs
- **业务类型**：**PLG/SaaS + 开源分发混合**。核心转化不是付费，而是：① GitHub Star；② 试用 demo；③ `docker run` / 二进制自托管安装；④ 文档深读；⑤ 贡献
- **市场**：**海外 GEO 为主**。英文为默认、8 种 locale，面向全球开源开发者。国内 GEO 属于机会型，暂不单独投入补丁手段

---

## 市场分层判断

按 `references/market-split-framework.md`：

- **海外 GEO 主路径**（ChatGPT / Gemini / Perplexity / Claude）：官网页矩阵、表单字段、页面事件、注册/安装链路回传是主骨架。这条路径承担 80%+ 的预期价值
- **国内 GEO 辅助**（DeepSeek / 豆包 / 元宝 / Kimi）：暂**不**配专属企微 / 电话 / 口令。只做 Brand Radar 监控 + 中文 landing 曝光观察，到有明确信号再补
- **混合收口**：所有归因写入同一张 `inbound_traffic` 事件表；`ai_platform` 字段按平台 enum，方便后续分国内/海外拆

---

## 公开证据表

| source_locator | absolute_time | fact_or_inference | how_used |
|---|---|---|---|
| `apps/landing/app/root.tsx:50-54` | 2026-04-18 | Ahrefs Web Analytics 已接入 landing | 复用为 pageview 底座 |
| `apps/landing/app/routes/home.tsx:38-56` | 2026-04-18 | GitHub / demo 外链已挂 UTM | 保留 UTM，补 server-side 中转 |
| `apps/website/index.html:6` | 2026-04-18 | demo 为 `noindex, nofollow` SPA，无 analytics | 新增 Ahrefs 或 1st-party 上报 |
| `apps/update-worker/src/analytics.ts:20-41` | 2026-04-18 | 已用 CF Analytics Engine 记录 instance 版本/国家 | 扩展 `install_source` blob |
| 项目 MEMORY.md | 2026-04-18 | 使用 Zustand + React Query，React Compiler 禁手写 memo | 上报 helper 不加无谓 memo |

---

## 官网核验

- **官方域名**：`opentoggl.com`（landing）、`track.opentoggl.com`（demo）
- **核验依据**：仓库 `apps/landing/app/lib/seo.ts` 的 `resolveSiteUrl()` 使用 `opentoggl.com`；`apps/website/index.html` canonical 指向 `track.opentoggl.com/`
- **GitHub**：`github.com/CorrectRoadH/opentoggl`（git remote 一致）

---

## 现状诊断

### 已具备资产

- Ahrefs Web Analytics（landing pageview / referrer / country）
- Ahrefs 订阅含 Brand Radar / GSC / Keywords Explorer / Site Explorer
- Landing UTM helper `appendUtm`
- Update-worker 已统计自部署实例 country × version

### 明显缺口

- GitHub 外链点击**无位置级归因**（UTM 对 GitHub 无效）
- demo 站**完全无 analytics**，landing→demo 转化不可测
- 无 GSC / Bing Webmaster 的周度报表机制
- 无 GEO prompt 监控；Brand Radar 未启用
- `docker run` 安装的"来源"字段缺失

### 效果追踪方法与原理说明

| 层 | 方法 | 监测原理 | 适用场景 | 执行动作 |
|---|---|---|---|---|
| **品牌层** | AI 答案中 mention 计数 | 被 AI 作为推荐 / 对比 / 引用对象即构成第三方背书 | ChatGPT / Perplexity / Gemini / Claude | Brand Radar 固定 prompt 库 + 周度快照 |
| **直接层** | `/go/:target` 中转 | 服务端 302 前写日志，位置级 ref 标签不丢 | 所有站外 GitHub / demo / X 链接 | Cloudflare Worker 记日志到 D1 / Analytics Engine |
| **直接层** | 跨域 visitor stitching | landing 首跳时写 `ot_v` 参数带到 demo | landing→demo 转化 | demo 入口读取 `ot_v` 写入首次事件 |
| **直接层** | `install_source` 回传 | 安装脚本携带来源 tag，update-worker 首次心跳落盘 | 自部署安装 | 扩展 `/api/update` query |
| **间接层** | 品牌词搜索量 | AI 曝光后用户主动搜 "opentoggl" | GSC 品牌词包 | 固定 query `opentoggl / open toggl / 开源 toggl` |
| **间接层** | demo first-visit 问卷 | 无 referer 时自报来源 | AI 答案无链接的引用场景 | demo onboarding 第 1 步加 "How did you hear?" |
| **间接层** | GitHub Star 增速 | AI 曝光的滞后信号 | 所有 AI 平台 | GH API 每天抓 stargazers_count |

---

## 直接效果追踪方案

### D1. `/go/:target` 1st-party 点击中转

**目标**：解决 "GitHub 外链无位置级归因" 的核心缺口。

**设计**：

- 新增 Cloudflare Worker 或 Zeabur service：`opentoggl.com/go/:target?ref=<slot>&locale=<xx>`
- `target` 来自受控白名单：`github / github-issues / github-discussions / demo / x / status / hn`（白名单写在仓库 `config/outbound-targets.json`，PR 可 review）
- 逻辑：解析 → 写日志（Analytics Engine `OUTBOUND_CLICKS` binding）→ 302 到真实 URL
- **fail-open**：binding 未配置或写日志抛异常，仍然 302
- landing 的 `appendUtm` 替换为 `buildGoUrl({ target, slot, locale })`，UTM 不再挂到真 URL 上（URL 变干净）
- slot 命名规范：`hero_cta / proof_card / footer / faq / docs_inline / readme_cta`

**Analytics Engine schema**：

```text
index1 = target                 # github, demo, ...
blob1  = slot                   # hero_cta, ...
blob2  = locale                 # en, zh, ...
blob3  = referer                # 发起页，用于二维交叉
blob4  = country                # CF-derived
blob5  = ua_family              # desktop / mobile / bot
blob6  = visitor_id             # 1st-party cookie `ot_v`，1 年 TTL，无 PII
```

**回报表**：Ahrefs MCP 拉不到这张表（自建的），所以在 `scripts/analytics-weekly.ts` 里用 CF REST API 拉并聚合。

### D2. 跨域 visitor stitching（landing → demo）

- landing 首次访问写 1st-party cookie `ot_v=<uuid>`（`Domain=.opentoggl.com`，`SameSite=Lax`）
- `/go/demo` 中转时把 `ot_v` 作为 query 透传：`track.opentoggl.com/?ot_v=<uuid>&src=<slot>`
- demo `src/main.tsx` 注入 1 个 20 行的 bootstrap：读 `ot_v`/`src` → 发一条 `first_visit` 事件到 1st-party endpoint `track.opentoggl.com/api/ingress/first-visit`（后端新增，写日志即返）→ 从 URL 清掉这两个参数（避免污染路由）
- 同一 `visitor_id` 在 landing pageview 和 demo first_visit 之间可 join，得到 landing→demo 转化

### D3. `install_source` 回传

- `update-worker` 已有 `recordUpdateRequest`。新增 `install_source` / `install_campaign` query 参数
- 安装脚本模板化：`curl install.sh | INSTALL_SOURCE=github_readme bash`；docker-compose 文档里 `x-install-source: docs_docker_compose`
- update-worker Analytics Engine 新增 blob7/blob8
- 每周聚合："本周新增实例来自 github_readme=12 / docs_docker_compose=8 / unknown=34"

### D4. demo first-visit 自报来源（按 GOALS 的 PLG 承接原则）

- demo 首次 onboarding 新增单选："How did you hear about OpenToggl?"
- 选项：`ChatGPT/Claude/Perplexity/Gemini | GitHub | Google Search | X/Twitter | HackerNews | Reddit | Friend | Other`
- 写入 `user_attribution` 表（backend 新建），一用户一条
- 这是 `Recoverable` 层的核心补丁，解决"referer 丢失但用户能说出来"的场景

---

## 间接效果追踪方案

### I1. SEO（Google Search Console + Bing Webmaster）

- 验证 `opentoggl.com`、`track.opentoggl.com` 两个 property（DNS TXT，已有 DNS 控制权）
- 通过 Ahrefs MCP `gsc-keywords / gsc-pages / gsc-performance-history` 每周自动拉报表
- 周度报表四张图：
  1. 品牌词（`opentoggl / open toggl / opentoggl self-hosted / 开源 toggl` 等）曝光/点击趋势
  2. 非品牌 query Top 20 涨跌（per locale）
  3. 高曝光低 CTR query（title/desc 优化线索）
  4. Page-level 曝光 Top 20（哪些 locale landing 在涨）
- 结构化数据审计：已有 `WebSite / Organization / FAQ` schema，纳入每月一次 Search Console 的 rich results 报告检查

### I2. Brand-level 信号

- 每天抓 GitHub `repos/{owner}/{repo}` API → stars / forks / watchers，留 `github_metrics_daily.jsonl`
- 每周对比：Brand Radar 的 mention 周增 vs GitHub star 周增 vs GSC 品牌词曝光周增。三者同向上涨才算 GEO 在起作用
- 不做 GA 或 cookie-based 品牌指纹

### 监测效果边界说明

OpenToggl 场景下，GEO 的**完整价值不可能被后台直接完整统计**。典型不可观测源：

- ChatGPT Pro 私有会话里对 OpenToggl 的引用
- 用户在 AI 里看完答案后**不点链接**，第二天直接 Google 搜 "opentoggl"
- 用户看到 AI 推荐后**口头推荐**给同事
- self-host 安装后才是"价值实现"，但安装脚本的来源完全由用户是否带 `INSTALL_SOURCE` 决定

因此 `20%~30%` 的保守规划假设**不适用**——我们官网承接较强但用户后续安装链路很散，应采用 `海外官网承接强、表单成熟的 SaaS / PLG` 起始区间并对 Unobservable 加权。

### 可观测性估算框架

| 层 | 规划区间 | 主要决定因素 | 下一阶段提升动作 |
|---|---|---|---|
| **Observed** | 25%~35% | `/go/:target` 覆盖度、demo first-visit 率、install_source 填充率 | 让安装脚本默认带 source；把 README 所有外链换 /go/ |
| **Recoverable** | 20%~30% | demo 首问问卷应答率、issue / PR 作者自报比例 | 问卷放在 blocking 但可 skip 的位置；onboarding 文案激励 |
| **Unobservable** | 40%~50% | AI 私有会话引用、口碑扩散、长决策成交 | 不追求降到 0；用品牌词/star 周增趋势作代理 |

**合计 = 100%**（保守下界 25%+20%+55% / 上界 35%+30%+35%）。这些是规划起点，部署后 4-8 周用实际数据校准。

---

## GEO 监控方案（Ahrefs Brand Radar 主路径）

### G1. Prompt 库（cur版 v1）

建仓库文件 `docs/analytics/geo-prompts.yaml`，初始 30-50 条，按主题分组：

- **直接品牌**：`What is OpenToggl? / Is OpenToggl free? / Who maintains OpenToggl?`
- **对比查询**：`Toggl Track alternative open source / self-hosted time tracker / free Clockify alternative / Harvest open source replacement`
- **使用场景**：`best open-source time tracker for teams / self-hosted time tracker with API / time tracker I can deploy on my own server`
- **中文**：`有没有开源的 toggl 替代品 / 自托管时间追踪工具推荐 / 开源 Toggl`
- **长尾**：`time tracker that works with docker compose / ...`

Prompt 库 PR review，涨跌都走 git。

### G2. Brand Radar 配置

- 通过 Ahrefs MCP `management-brand-radar-prompts / management-brand-radar-reports` 把 prompt 库同步到 Brand Radar
- 监控品牌列表：`OpenToggl`（primary）、`Toggl Track / Clockify / Harvest / Timely / TimeCamp`（competitors）
- 核心指标：
  - `mentions-overview`：每周 OpenToggl 被提到次数
  - `sov-overview`：与竞品的 share of voice
  - `cited-domains / cited-pages`：AI 是引用谁的内容来提到 OpenToggl（定位外链价值）

### G3. 出站动作闭环

当 Brand Radar 显示某类 prompt 竞品 SoV 远高于我们：

- 如果 cited-pages 指向 awesome-list / comparison blog → 做外链外联
- 如果 AI 在答案里描述我们**错了**（版本、license、feature） → 优化官网 FAQ / README 表格，让下次 AI 索引时拿到正确事实
- 如果整类 prompt 几乎没人被提到 → 考虑自己写一篇 SEO + GEO 双优化文章

---

## 归因口径与数据表设计

统一一张 attribution dictionary，字段收口：

```text
inbound_event {
  event_id        uuid
  event_time      timestamptz
  event_type      enum(pageview, outbound_click, first_visit, install_ping, survey_answer)
  site            enum(landing, demo, github, update_worker)
  visitor_id      text         -- ot_v cookie, nullable for server-only events
  target          text         -- outbound_click 用：github / demo / x
  slot            text         -- hero_cta / proof_card / readme
  locale          text         -- en / zh / ...
  referer_domain  text         -- github.com / chatgpt.com / perplexity.ai
  ai_platform     text         -- 由 referer / 问卷答案推断
  country         text
  campaign        text         -- UTM 兼容字段（外部入链仍会挂 utm）
  raw_referer     text         -- 审计用
}
```

分库策略：

- `outbound_click` / `pageview(demo)` → CF Analytics Engine
- `first_visit / install_ping / survey_answer` → Postgres（与业务库同）
- `pageview(landing)` → Ahrefs Web Analytics（外部，只读）

周报脚本把三源拉到一张 duckdb 视图再出图。

---

## 优先级路线图

| 阶段 | 动作 | 负责方 | 验收 |
|---|---|---|---|
| **P0（本周）** | 建 `/go/:target` Worker + 白名单 + 替换 landing 所有外链 | landing 团队 | 点 hero CTA 访问 GitHub，CF Analytics Engine 有一条 `slot=hero_cta` |
| **P0** | GSC / Bing Webmaster 验证 + 周报脚本 v1 | SEO 负责人 | 每周一收到自动报表 |
| **P0** | `geo-prompts.yaml` v1 + Brand Radar prompt 同步 | GEO 负责人 | Brand Radar 能看到 OpenToggl 本周 mention 计数 |
| **P1（2-3 周）** | demo 端 bootstrap ingress + `ot_v` 跨域串联 | demo 团队 | landing 点 hero → demo 能看到同一 visitor_id 的 first_visit |
| **P1** | `install_source` 参数 + 安装脚本更新 + update-worker blob 扩展 | backend | `curl install.sh` 默认带 `github_readme` source |
| **P2（4-6 周）** | demo onboarding 首问问卷 + `user_attribution` 表 | backend + frontend | 新 demo 账号 60% 以上回答问卷 |
| **P2** | 周报可视化（duckdb 视图 → Grafana/Metabase） | analytics | 每周一张"GEO 综合仪表板" |
| **P3（按需）** | `geo-prompts.yaml` 轮替 + 竞品 SoV 月度复盘 | GEO 负责人 | 月度 SoV 趋势图 |

---

## 置信度与缺口

- **高置信度**：`/go/:target` 中转、GSC 接入、Brand Radar 接入，这三条是成熟路径
- **中置信度**：跨域 visitor stitching，`ot_v` cookie 在 Safari ITP / Firefox ETP 下可能被缩到 7 天，对长周期归因有损；可接受
- **低置信度**：`install_source` 覆盖率，取决于用户是否改 install 命令；不强制，不 block release
- **信息缺口**：
  - 国内 GEO 的实际流量占比未知（等 Brand Radar 数据回来再决定是否补国内平台监控）
  - self-hosted 实例"活跃度"与"来源"的相关性未知（要 update-worker 多跑几周）
  - GEO prompt 库的初始版需要 1-2 次迭代才能稳

---

## 与 docs / openapi 的一致性

- 新增的 backend endpoint（`/api/ingress/first-visit`、`/api/attribution/survey`）**必须先写进 `openapi/opentoggl-*.openapi.json`**，再生成代码（符合 CLAUDE.md "OpenAPI 先行" 规则）
- `config/outbound-targets.json` 白名单格式写进 `docs/analytics/outbound-config.md`（本阶段不建，P0 完成后补）
- `geo-prompts.yaml` 作为仓库版本化真相源，Brand Radar 控制台为消费方，不是相反
