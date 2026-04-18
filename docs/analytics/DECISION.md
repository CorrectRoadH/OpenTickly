**相关文档**:
- [GOALS.md](GOALS.md)
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)

## 目的

这份文档不重复定义目标，也不重写各方案实现细节。

这里只回答 4 个问题：

- 本阶段归因范围为什么收口到 landing 一个站
- 当前推荐哪一个 PLAN 作为主路径
- 为什么 GitHub 位置级归因与 demo 归因暂不做
- 在什么前提下，推荐结论可能改变

---

## 决策摘要（2026-04-18）

- **范围**：本阶段只对 `opentoggl.com`（landing）做点击归因与 GEO 归因
- **推荐主路径**：[PLAN-4](PLAN-4.md) landing-only，无 Worker、无 backend 改动
- **暂不做**：GitHub 位置级归因（optional）、demo 端归因（deferred）、自托管 `install_source`（deferred）
- **保留**：SEO 周报（GSC + Ahrefs MCP）、GEO 监控（Ahrefs Brand Radar + `geo-prompts.yaml`）

---

## 为什么收口到 landing 一个站

### demo 需要登录，匿名→登录合并是独立设计问题

- `track.opentoggl.com` 必须登录才能访问功能页
- 即使把 landing 的 `ot_v` cookie 或 query 参数带到 demo URL，demo 第一时间**没有匿名 session** 可以把这条 `first_visit` 写进去
- 要做对，必须设计"匿名 visitor_id → 登录后 user_id"的合并策略，类似 Segment 的 identify / alias 模型；这不是 "加一个端点" 就能解决的问题
- 在没有 landing 真实点击数据支撑 ROI 前就投入这个设计，是过度工程

### GitHub UTM 无效，Worker 建起来 ROI 不明

- `github.com/...?utm_source=opentoggl_landing&utm_medium=hero_cta` 这类链接，GitHub 自己不把 UTM 喂给任何分析系统，我们拿不到
- 要拿位置级数据（hero vs footer vs proof_card），必须自建 `opentoggl.com/go/:target` 中转 Worker
- 当前阶段最大的未知不是 "哪个 CTA 最有效"，而是 "有没有人在点、AI 里到底有没有提 OpenToggl"
- 先用最轻的方式拿到量级，再决定要不要投入 Worker 基建

### landing 本身已经有足够基建承载 required 目标

- Ahrefs Web Analytics 已在 `apps/landing/app/root.tsx` 加载，pageview / referrer / country / outbound click 开箱可用
- Ahrefs 订阅已覆盖 Brand Radar / GSC / Rank Tracker / Site Explorer
- 所以本阶段**不需要新增任何 1st-party server**，landing 作为纯静态站就能完成 required 目标
- landing 是 `ssr: false` + prerender 的静态站，这个事实从限制变成了简化：没有 server 就没有运维负担

---

## 当前推荐：PLAN-4

[PLAN-4](PLAN-4.md) 是 [PLAN-3](PLAN-3.md) 去掉 `/go/:target` Worker 后的版本，再加一件 landing 侧的 Ahrefs outbound event 规范：

| 动作 | 来自 | 是否做 |
|---|---|---|
| Ahrefs Web Analytics outbound event 规范（给 CTA 加 `data-ahrefs-event` 或类似标签） | 新增 | ✅ |
| GSC / Bing 周报脚本 v1 | PLAN-3 | ✅ |
| `geo-prompts.yaml` v1 + Brand Radar 同步 + 周度 mention / SoV 快照 | PLAN-3 / PLAN-1 | ✅ |
| `/go/:target` 中转 Worker | PLAN-3 / PLAN-1 | ❌（optional，暂不做）|
| demo 端 Ahrefs / 1st-party endpoint | PLAN-1 | ❌（deferred）|
| 跨域 `ot_v` visitor stitching | PLAN-1 | ❌（deferred）|
| `install_source` + update-worker blob 扩展 | PLAN-1 | ❌（deferred）|
| demo 首问问卷 + `user_attribution` 表 | PLAN-1 | ❌（deferred）|
| Plausible 自托管 | PLAN-2 | ❌（不必要）|

### landing 侧点击归因的最轻落地

由于 `/go/:target` 不建，landing 的外链点击归因**完全依赖 Ahrefs Web Analytics 的 outbound tracking**：

- Ahrefs 默认会把所有 `<a href="http...">` 点击记为 outbound event
- 可以在 `home.tsx` / `footer.tsx` 的 CTA 上加标识（如 `data-ahrefs-event="cta_github_hero"`）以区分 slot
- 丢失掉的那部分（ad blocker 命中、JS 未加载）进入"暂时不可观测"层，用 SEO 品牌词 / Brand Radar mention 作代理

### GEO 部分与 PLAN-1 完全一致

- `geo-prompts.yaml` 作为仓库版本化真相源
- Brand Radar 作为消费端，监控 ChatGPT / Gemini / Perplexity / Claude 四大平台的 mention 与 cited-pages
- 周度对比 SoV，月度校准 prompt 库

---

## 可观测性估算在本次收口后的调整

[PLAN-1.md](PLAN-1.md) 给 Observed / Recoverable / Unobservable 的规划区间是 `25-35 / 20-30 / 40-50`，那是全量方案落地后的状态。

本次收口后，范围只到 landing，三层分配应该按如下方式理解：

| 层 | 区间（本阶段） | 说明 |
|---|---|---|
| Observed | 15%~25% | landing pageview + outbound click via Ahrefs；丢掉 demo first_visit 与 install_source |
| Recoverable | 5%~15% | 仅 GitHub issue / Discussions 偶发自报来源，无系统化问卷 |
| Unobservable | 60%~80% | AI 私有会话、口碑、demo 登录后未携带来源、自托管未带 source |

**合计下界 15+5+80=100%，上界 25+15+60=100%**。这是起始规划假设，部署 4-8 周后用真实数据校准。

**Unobservable 比例显著更高是刻意的**：本阶段目的是拿到曝光量级而非归因全貌；"看不到的那部分"通过 GSC 品牌词与 Brand Radar mention 的趋势间接解释。

---

## 在什么前提下推荐结论会变

### 触发条件 → 启动 PLAN-1 P1

以下任一满足：

- Ahrefs 显示 landing 外链点击量级稳定（> 周 200 次 CTA click），且其中 demo 链接占比 > 30% → 值得补 demo 端匿名归因
- Brand Radar 显示 OpenToggl 在多个海外平台稳定被 mention（> 周 10 次），且 cited-pages 指向 landing → 值得补 demo 首问问卷恢复"被 AI 推荐但没链接"的那部分
- GitHub stars 周增速显著高于 landing pageview 周增速 → 说明 GitHub 有独立流量来源，值得建 `/go/:target` 区分 hero / footer / readme 等位置

### 触发条件 → 启动 PLAN-2（Plausible 自托管）

- 产品定位公开对外强调 "privacy-friendly / self-hostable"，且有人愿意承担 Plausible 自托管运维
- 或 Ahrefs 订阅成本需要缩减，但又需要保留 web analytics 能力

### 触发条件 → 放弃当前收口，回到 PLAN-1 完整版

- 团队决定把"从 AI 被发现 → 试用 demo → 转化为自托管用户"作为 OKR 主线路径
- 产品对"增长归因精度"有明确 KPI

---

## 开工顺序

按 [PLAN-4](PLAN-4.md) 的路线图执行：

1. 改 `apps/landing/app/routes/home.tsx` + `components/footer.tsx`：CTA URL 挂 `?s=<slot>` 参数 + 删 GitHub 外链的 UTM（demo 外链 UTM 保留）
2. 建 `docs/analytics/ai-referers.md`（AI 平台 referer 白名单 cheat-sheet）
3. 建 `docs/analytics/geo-prompts.yaml` v1（30 条 prompt）
4. Ahrefs 控制台：连接 GSC 到 `opentoggl.com`
5. Ahrefs 控制台：把 `geo-prompts.yaml` 里的 prompt 加到 Brand Radar

完成以上 5 项即为本阶段完成。**不写周报脚本**，每周按 PLAN-4 的 SOP 在 Ahrefs 控制台 15 分钟看一次。

观察窗 4-8 周，然后按上文"触发条件"决定是否升级。
