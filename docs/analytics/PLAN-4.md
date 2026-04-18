**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)
**决策**: [DECISION.md](DECISION.md)

---

## 实现方案 4（推荐 / 最小落地）

### 简述

只对 `opentoggl.com` landing 一个站做归因。**不建 Worker、不改 backend、不动 update-worker、不改 demo、不写周报脚本**。所有数据都在 Ahrefs 控制台里看：
- landing pageview / referrer / country：Ahrefs Web Analytics（已加载，直接看）
- landing 外链点击：Ahrefs outbound link 报表 + 在 CTA URL 上挂无害的 `?s=<slot>` 查询参数让 Ahrefs 自动按完整 URL 拆分
- SEO：Google Search Console 连到 Ahrefs，SEO 数据也在 Ahrefs 里看
- GEO（AI 答案曝光）：Ahrefs Brand Radar + `docs/analytics/geo-prompts.yaml` 作为 prompt 库真相源
- GEO（AI 平台引入）：Ahrefs Referrers 报表按 `docs/analytics/ai-referers.md` 白名单人工过滤

未解决的是 GitHub 位置级归因的绝对精度（ad blocker 仍会影响 Ahrefs 命中率）与 landing→demo 转化，两者都在 `GOALS.md` 标为 `optional` / `deferred`。

**代码改动**：`apps/landing/app/routes/home.tsx` + `apps/landing/app/components/footer.tsx`，约 15-20 行。
**平台配置**：GSC 连到 Ahrefs，Brand Radar 配 prompt。
**仓库新增**：`docs/analytics/ai-referers.md`、`docs/analytics/geo-prompts.yaml`。

---

## 与其他方案的差异

| 模块 | PLAN-1 | PLAN-3 | PLAN-4（本方案） |
|---|---|---|---|
| landing pageview | Ahrefs | Ahrefs | **Ahrefs**（不变）|
| landing 外链点击 | `/go/:target` Worker | `/go/:target` Worker | **CTA 挂 `?s=<slot>` 参数 + Ahrefs outbound 报表**|
| GitHub 位置级归因 | ✅ 精确 | ✅ 精确 | ✅ 趋势级（受 ad blocker 影响）|
| demo 端 analytics | ✅ | ❌ | ❌（deferred）|
| 跨域 visitor stitching | ✅ | ❌ | ❌（deferred）|
| install_source | ✅ | ❌ | ❌（deferred）|
| demo 首问问卷 | ✅ | ❌ | ❌（deferred）|
| SEO | GSC + MCP 周报脚本 | GSC + MCP 周报脚本 | **GSC 连到 Ahrefs，控制台直接看**|
| GEO（AI 答案曝光）| Brand Radar + prompt 库 | Brand Radar + prompt 库 | **Brand Radar + prompt 库**（不变）|
| GEO（AI 平台引入）| referer 白名单 | referer 白名单 | **referer 白名单 cheat-sheet**（人工查看）|
| 新增代码基础设施 | Worker + Postgres + handler | Worker | **0**|
| 主要仓库产物 | 多个服务改动 | Worker + config | **2 个 docs 文件 + 1 个 home.tsx 改动**|
| 工程量 | ~4 周 | ~1 周 | **半天-1 天** |

---

## 能回答与不能回答的问题

### ✅ 能回答（都在 Ahrefs 控制台里）

- landing 日/周 pageview 趋势，按 locale × page × country 拆
- 各渠道（organic / referral / social / AI / direct）分布
- landing 里 `?s=hero` vs `?s=footer` vs `?s=proof_card` 的外链点击对比（按 URL 拆）
- GSC 查询：品牌词曝光 / 点击 / CTR、非品牌 Top query、page-level 曝光
- Brand Radar：OpenToggl 在 ChatGPT / Gemini / Perplexity / Claude 的 mention、SoV、cited-pages
- 进 landing 的访客有多少 referer 来自 AI 平台（按 `ai-referers.md` 白名单过滤 Referrers 报表）

### ❌ 不能回答（本阶段接受）

- hero CTA vs footer CTA 哪个**精确**点击更多（ad blocker 命中下丢失 20-35%，只看趋势）
- 点 demo 链接的用户中有多少真的登录了 demo
- 自托管实例从哪里看到 install 命令
- AI 答案里提到 OpenToggl 但用户没点链接的那部分转化

---

## 核心设计

### 1. CTA 挂 `?s=<slot>` 无害查询参数（landing 唯一代码改动）

Ahrefs Web Analytics outbound 报表按**完整 URL**聚合。只要让同一个目标在不同位置用不同 URL，Ahrefs 自动会分成两条记录。

```tsx
// apps/landing/app/routes/home.tsx
const githubHref = "https://github.com/CorrectRoadH/opentoggl?s=hero";
const demoHref = appendUtm("https://track.opentoggl.com", {
  source: "opentoggl_landing",
  medium: "hero_cta",
  campaign: "try_demo",
  content: locale,
});
// demo UTM 保留，给未来 P1 的 landing→demo 归因做初始信号
```

**命名规范**：

```
?s=hero
?s=proof_card
?s=footer
?s=faq
?s=nav_header
```

**为什么 `?s=` 而不是 `?utm_*`**：
- `utm_*` 让非 analytics 用户以为有 GA 在读，会产生错觉
- 一个字符 `s=` 短、明确是"slot"、GitHub 会原样保留不影响跳转
- Ahrefs 在 outbound 报表里按完整 URL 拆分，看到的就是 `.../opentoggl?s=hero` 和 `.../opentoggl?s=footer` 两条

### 2. 删掉 GitHub 外链上的 UTM

`home.tsx` 里 proof_items 给 GitHub URL 挂的 `utm_source / utm_medium / utm_campaign / utm_content` 整段删掉。
UTM 对 GitHub 无效，只会污染 URL 并可能影响 CTR。

demo 外链上的 UTM **保留**，因为未来 P1 启动 demo 归因时会作为初始跨域信号。

### 3. 平台侧配置（Ahrefs 控制台，零代码）

#### 3a. 连接 GSC 到 Ahrefs

- Ahrefs 控制台 → Integrations → Google Search Console → Connect
- 授权 `opentoggl.com` property
- 授权后，GSC 的 query / page / impression / click / CTR 数据在 Ahrefs 里用同一个界面看
- 不需要单独的 GSC 账号或周报脚本

#### 3b. Brand Radar prompt 配置

- Ahrefs 控制台 → Brand Radar → Prompts
- 把 `docs/analytics/geo-prompts.yaml` 里的 prompt 逐条添加
- 监控品牌：`OpenToggl`（primary）+ `Toggl Track / Clockify / Harvest / Timely / TimeCamp`（competitors）
- 默认频率：周粒度

### 4. 仓库产物：两份 docs 真相源

#### 4a. `docs/analytics/geo-prompts.yaml`

Brand Radar 控制台里配的 prompt 以**本文件为真相源**，改 prompt 通过 PR review。v1 大约 30 条，分组：

```yaml
# docs/analytics/geo-prompts.yaml
brand_direct:
  - What is OpenToggl?
  - Is OpenToggl free?
  - Who maintains OpenToggl?
  - Is OpenToggl really open source?
comparison:
  - Toggl Track alternative open source
  - Self-hosted time tracker
  - Free Clockify alternative
  - Harvest open source replacement
scenario:
  - Best open-source time tracker for teams
  - Self-hosted time tracker with API
  - Docker-compose time tracker
  - Time tracker for freelancers self-hosted
chinese:
  - 有没有开源的 toggl 替代品
  - 自托管时间追踪工具推荐
  - 开源 toggl
```

#### 4b. `docs/analytics/ai-referers.md`

Ahrefs Referrers 报表是**按 referer 域名**展示的。人工过滤出 "AI 平台引入" 的那部分，需要知道哪些域名算 AI 平台。这份 cheat-sheet 就是白名单：

```markdown
# AI 平台 referer 白名单

查看 Ahrefs Web Analytics Referrers 报表时，按下列域名筛选即得 "来自 AI 平台的真实 inbound"。
平台新出或改域名时通过 PR 更新。

## 海外

- chatgpt.com, chat.openai.com      — ChatGPT
- perplexity.ai, www.perplexity.ai  — Perplexity（referer 最稳定）
- gemini.google.com                 — Google Gemini
- claude.ai                         — Anthropic Claude
- copilot.microsoft.com             — Microsoft Copilot
- you.com                           — You.com
- phind.com                         — Phind
- kagi.com                          — Kagi Assistant

## 国内

- doubao.com                        — 字节豆包
- kimi.moonshot.cn                  — Kimi
- chat.deepseek.com                 — DeepSeek
- yuanbao.tencent.com               — 腾讯元宝

## 局限

- ChatGPT 在 "copy link" 场景下 referer 会丢
- iOS app 内嵌浏览器经常 referer 为空
- Perplexity 命中率最高，ChatGPT 次之，Claude 最不稳定
```

---

## 每周看数据的 SOP（15 分钟）

登陆 Ahrefs 控制台，按顺序看 4 个视图：

1. **Web Analytics → Overview**：pageview / visitor 趋势，看是否健康
2. **Web Analytics → Referrers**：对照 `ai-referers.md` 白名单看 AI 平台 inbound；对照 `google / bing / duckduckgo` 看 organic
3. **Web Analytics → Outbound Links**：看 `?s=hero` / `?s=footer` / `?s=proof_card` 对 GitHub 和 demo 的点击分布
4. **Brand Radar → Mentions + SoV**：看 OpenToggl 与竞品的 AI 答案出现趋势

看完如果想留底，截图存 `docs/analytics/reports/YYYY-Www.md`（gitignored，可选）。

**不需要周报脚本**：Ahrefs 控制台本身就是仪表板，脚本只在数据源不在 Ahrefs 时才需要。

---

## 各 required 目标如何被满足

| required 目标 | 在哪里看 | 需要做什么 |
|---|---|---|
| landing pageview / referrer 分布 | Ahrefs → Web Analytics | 0 |
| landing 外链点击按 slot 分布 | Ahrefs → Outbound Links | 给 CTA 挂 `?s=<slot>` |
| SEO（GSC 曝光 / CTR / query / page） | Ahrefs → Integrations → GSC view | 连接 GSC |
| GEO（AI 答案 mention / SoV） | Ahrefs → Brand Radar | 配 prompt |
| GEO（AI 平台真实引入流量） | Ahrefs → Referrers | 维护 `ai-referers.md` 白名单 |

---

## 可观测性估算框架（本阶段）

引入 "Ahrefs referer 白名单" 作为直接观测层后，PLAN-4 的三层分配相比上一版往上调：

| 层 | 区间 | 主要决定因素 | 提升动作 |
|---|---|---|---|
| **Observed** | 25%~35% | Ahrefs 脚本命中率（ad blocker）、CTA slot 覆盖度、AI referer 泄露率 | 给所有 CTA 挂 `?s=` slot；持续维护 `ai-referers.md` |
| **Recoverable** | 5%~15% | GitHub issue / Discussions 偶发自报来源 | issue 模板加 "How did you find OpenToggl" |
| **Unobservable** | 50%~70% | AI 私有会话、口碑、iOS app 内嵌浏览器 referer 丢失 | 不追求归零，用 GSC 品牌词 + Brand Radar mention 趋势代理 |

合计下界 25+5+70=100，上界 35+15+50=100。

**比上一版高的 10 个点**来自 AI referer 白名单：原来 "AI 平台引入的那部分访问" 被归进 Unobservable，现在其中 referer 能保留的那部分（Perplexity ~80%、ChatGPT ~40%、Claude ~20% 的毛估）变成 Observed。

---

## 优先级路线图

| 阶段 | 动作 | 验收 | 工期 |
|---|---|---|---|
| **P0 Day 1 上午** | 改 `home.tsx` + `footer.tsx`：CTA URL 挂 `?s=<slot>` + 删 GitHub UTM | git diff 干净，landing 本地跑通 | 1-2 小时 |
| **P0 Day 1 上午** | 建 `docs/analytics/ai-referers.md` | 文件 commit | 15 分钟 |
| **P0 Day 1 下午** | 建 `docs/analytics/geo-prompts.yaml` v1（30 条） | 文件 commit | 1 小时 |
| **P0 Day 1 下午** | Ahrefs 控制台：连接 GSC 到 `opentoggl.com` | Ahrefs 里能看到 GSC 数据 | 30 分钟（含等同步） |
| **P0 Day 1 下午** | Ahrefs 控制台：把 `geo-prompts.yaml` 30 条 prompt 加到 Brand Radar | Brand Radar 显示本周已有查询 | 30 分钟 |
| **观察窗** | 跑 4-8 周，每周按 SOP 看一次 | — | 1-2 月 |
| **复盘** | 按 [DECISION.md](DECISION.md) "触发条件" 决定升级 | 更新 DECISION.md | — |

**总计不到 1 天**（不含 DNS / GSC 数据同步的等待时间）。

---

## 升级路径

PLAN-4 → PLAN-3：加 `/go/:target` Worker。适用于 ad blocker 导致 outbound 数据不可信、需要精确位置归因时。

PLAN-4 → PLAN-1 P1：加 demo 1st-party ingress endpoint + 匿名→登录合并。适用于 landing→demo 转化成为 OKR 时。

PLAN-4 → PLAN-2：Plausible 自托管替换 Ahrefs Web Analytics。适用于强隐私姿态是产品定位时。

三条升级路径互相不冲突，PLAN-4 的 `geo-prompts.yaml` / `ai-referers.md` / CTA slot 规范 100% 复用。

---

## 缺口与风险

- **ad blocker 损耗**：开源开发者受众 ad blocker 使用率高于平均，Ahrefs Web Analytics 的命中率可能在 60-75%，`?s=<slot>` 的 outbound 拆分也受这个影响
- **AI referer 泄露率不均**：Perplexity 稳定、ChatGPT 中等、Claude 较差；Brand Radar mention 数与 referer inbound 数会系统性错位
- **Brand Radar 订阅层级**：需要确认当前 Ahrefs 订阅是否包含 Brand Radar；如果不包含，GEO 监控降级为只靠 referer 白名单
- **GSC 数据延迟**：T+2 天才到账
- **prompt 库质量**：v1 的 30 条是起点不是答案，前 2-4 周要根据 Brand Radar 返回的 cited-pages 迭代 prompt
- **单源风险**：所有数据都在 Ahrefs 手里，Ahrefs 出故障或订阅停掉会同时损失 pageview / SEO / GEO 三块；此风险在 PLAN-4 阶段接受，如果变成阻塞性问题就走 PLAN-2
