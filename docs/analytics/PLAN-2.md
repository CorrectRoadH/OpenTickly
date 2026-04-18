**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)
**决策**: [DECISION.md](DECISION.md)（当前主路径是 [PLAN-4](PLAN-4.md)；本文档是自托管 Plausible 的备选路径）

---

## 实现方案 2（自托管优先）

### 简述

用 **Plausible 自托管**替代 Ahrefs Web Analytics 作为 landing + demo 两站的统一 pageview / outbound 底座，其他部分（`/go/:target` 中转、GSC/Bing、Brand Radar、`install_source`、demo 首问问卷）与 PLAN-1 一致。核心差异：pageview 与 outbound click 数据全部落在 OpenToggl 自己的 Plausible 实例里，不再依赖 Ahrefs Web Analytics；Ahrefs 订阅降级为纯 SEO + Brand Radar 工具。未解决的是 Plausible 实例本身需要长期运维（ClickHouse + PostgreSQL），以及 GEO 部分与 PLAN-1 一样仍依赖 Ahrefs Brand Radar。

---

## 与 PLAN-1 的差异点

PLAN-2 只改**直接 / 间接效果监测底座**那一层，其他决策全部复用 PLAN-1：

| 模块 | PLAN-1 | PLAN-2 |
|---|---|---|
| landing pageview | Ahrefs Web Analytics | **自托管 Plausible** |
| demo pageview | 自建 1st-party endpoint | **Plausible 同一实例**（`track.opentoggl.com` 注册为第二个 site） |
| outbound click | Analytics Engine（CF Worker） | **Plausible `outbound-link-click`** 内置事件 + `/go/:target` 仍保留（见下文） |
| cross-site stitching | `ot_v` cookie | Plausible 天然 same-root-domain session；跨子域开箱 |
| SEO | GSC + Ahrefs MCP | **Plausible Search Console 集成** + GSC 原生 + Ahrefs MCP（作为 backup） |
| GEO | Ahrefs Brand Radar | **同 PLAN-1**（Brand Radar 无替代） |
| 隐私姿态 | 3rd-party Ahrefs JS | **1st-party 域名 + 无 cookie**（GDPR 最干净） |

---

## 为什么仍保留 `/go/:target`

看起来 Plausible 的 `outbound-link-click` 内置事件可以取代 `/go/:target`，但**不行**：

1. **Ad blocker 命中**：Plausible 自托管虽然可以自定义路径，但 `plausible.js` 脚本仍会被部分 ad blocker 按文件名特征拦截，拦截率估计 15%~30%
2. **server-side 事件**：README / docs / 外部站点上引用的 `opentoggl.com/go/github` 链接不依赖任何 client JS，是服务端 302 前记录的。ad blocker 无法影响
3. **日志长期留存**：Plausible 默认保留事件数据，但 OpenToggl 可能希望 outbound 点击的原始记录独立于 Plausible 升级/回滚留存

所以 `/go/:target` 在 PLAN-2 里仍保留，和 Plausible 的 `outbound-link-click` **双写**：

- client 可达时：Plausible 记一条 `outbound-link-click` + Worker 记一条
- client 不可达（ad blocker）：仅 Worker 记一条
- 周报对齐两份数据，差值就是"被 ad block 拦截的真实 pageview 数"——这本身也是一个有价值的信号

---

## Plausible 自托管部署

### 部署形态

- 新增服务：`plausible.opentoggl.com`
- 栈：Plausible CE + PostgreSQL + ClickHouse（docker-compose 或 Zeabur 模板）
- 建议放在和 landing 同根域的子域，确保 1st-party cookie / 请求域名
- Plausible 上报端点：`plausible.opentoggl.com/api/event`
- 脚本路径**自定义**：`opentoggl.com/a.js` 反代到 Plausible，绕过基于文件名的 ad blocker 规则（命中率从 ~30% 拦截降到 <5%）

### 接入

- `apps/landing/app/root.tsx`：移除 `analytics.ahrefs.com/analytics.js`，换成自定义 script tag 指向 `/a.js`
- `apps/website/src/main.tsx`：bootstrap 里加载同一脚本（demo 注册为 Plausible 第二 site）
- `track.opentoggl.com` 的 `noindex` 不影响 Plausible 上报

### 运维边界

- Plausible CE 升级节奏大约 1-2 次/月；升级窗口期 <10 分钟，不算重
- ClickHouse 数据分区需每季度归档一次（OpenToggl 流量规模下问题不大）
- 备份：ClickHouse 每周全量 + 每天增量 → S3（Cloudflare R2 即可）
- 监控：Plausible 自带 health endpoint，纳入内部 uptime 监控

---

## SEO 集成差异

- Plausible 官方支持 GSC 集成：在 Plausible 控制台里授权 GSC → 直接在同一面板看 query / page / CTR / 平均排名
- 好处：SEO + Web analytics 在一张视图里，减少工具切换
- 代价：Plausible 的 GSC view 没有 Ahrefs 的 opportunity score / SERP feature 识别等高级分析。这部分仍在 Ahrefs 看
- **决策**：日常例行看 Plausible（方便），深度洞察看 Ahrefs（深度）

---

## 预算与成本对比

| 项 | PLAN-1 | PLAN-2 |
|---|---|---|
| Ahrefs 订阅 | 保留全量（Web Analytics + Brand Radar + GSC + Rank Tracker） | 保留订阅但 Web Analytics 功能闲置；可观察降级空间 |
| 自托管基建 | 仅 `/go/:target` Worker（低成本） | Plausible + ClickHouse + PG，CF Worker（额外 4-8 USD/月 on Zeabur） |
| 初始接入工时 | ~1 周 | ~2 周（多 Plausible 部署 + 迁移） |
| 数据主权 | Ahrefs 持有 pageview | **OpenToggl 完全持有** |

---

## 何时选 PLAN-2

- 项目价值主张要求强调 "self-hosted, privacy-friendly"（与 OpenToggl 品牌一致）
- 愿意承担 Plausible 自托管运维
- 希望将来能**在 landing 上展示自己的 live dashboard**（Plausible 支持 public dashboard）作为 dogfooding 证明
- 不希望 pageview 数据和 Ahrefs 订阅捆绑

## 何时不选

- 没人能接手 Plausible 的升级 / 备份责任
- 短期内只想解决 GitHub CTA 归因 → 走 PLAN-3
- Ahrefs 订阅成本预算无法压缩 → 多装一套只是增加复杂度

---

## 其他部分

`/go/:target` 中转、`install_source` 扩展、demo first-visit 问卷、GEO prompt 库、Brand Radar 配置、`Observed/Recoverable/Unobservable` 可观测性估算、数据表设计、优先级路线图 **完全复用 PLAN-1**。详见 [PLAN-1.md](PLAN-1.md) 的相应章节。
