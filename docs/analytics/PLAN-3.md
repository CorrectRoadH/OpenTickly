**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)
**决策**: [DECISION.md](DECISION.md)（当前主路径是 [PLAN-4](PLAN-4.md)；本文档保留作为"要不要加 GitHub 位置归因 Worker"的参考）

---

## 实现方案 3（最小闭环）

### 简述

只做三件事：① 新增 `/go/:target` 1st-party 中转解决 GitHub 外链位置归因；② 把 Ahrefs MCP 的 GSC 工具串成一个每周手动运行的报表脚本；③ 启用 Ahrefs Brand Radar 的 30 条初始 prompt。**不做** demo analytics、**不做** 跨域 visitor stitching、**不做** install_source、**不做** 首问问卷、**不做** Plausible 自托管。目标是 1 周内上线，拿最便宜的那部分 ROI，等真实数据说话再决定要不要升级到 PLAN-1 / PLAN-2。未解决的是 landing→demo 转化、自部署安装来源、AI 答案到最终安装的完整链路，这些都进 Unobservable 层。

---

## 做什么

### 1. `/go/:target` 中转（~2 天）

- Cloudflare Worker，路由 `opentoggl.com/go/:target`
- 白名单仅 3 个：`github / github-issues / demo`
- Analytics Engine schema：`index1=target, blob1=slot, blob2=locale, blob3=referer_path, blob4=country, blob5=ua_family`
- landing `home.tsx` / `footer.tsx` 所有外链从 `appendUtm(...)` 切成 `buildGoUrl(...)`
- UTM 参数从外链上**拆除**（URL 变干净）

### 2. SEO 周报脚本（~1 天）

- `scripts/analytics/seo-weekly.ts`：调用 Ahrefs MCP `gsc-keywords / gsc-pages / gsc-performance-history`
- 输出：markdown 周报，存 `docs/analytics/reports/seo-YYYY-Www.md`
- 字段：品牌词曝光 / 点击 / CTR、非品牌 query Top 10 涨跌、高曝光低 CTR 清单（Top 5）
- 先跑 `opentoggl.com` 一个 property；`track.opentoggl.com` 是 noindex 不用跑

### 3. Brand Radar 初始 prompt（~半天）

- `docs/analytics/geo-prompts.yaml` v0，20-30 条（见 PLAN-1 G1 的示例）
- 通过 Ahrefs MCP 把 prompt 同步到 Brand Radar
- 每周一次手动查 `brand-radar-mentions-overview / sov-overview`，结果追加到 `docs/analytics/reports/geo-YYYY-Www.md`

### 4. 保留现状的部分

- Ahrefs Web Analytics 保持 landing 上**现状**（pageview 底座不换）
- demo 站保持**无 analytics**（已知缺口，P0 不动）
- update-worker 保持**现状**（不加 install_source）

---

## 不做什么（以及为什么）

| 不做 | 为什么 |
|---|---|
| demo 端 Ahrefs / Plausible | 需要改 `apps/website` bootstrap、处理 noindex、考虑跨域，不是 1 周能完的；留到有真实转化压力时再做 |
| 跨域 visitor stitching | 同上，且 Safari ITP 会压缩 cookie TTL，ROI 不稳定 |
| `install_source` 参数 | 需要改 install 脚本 + update-worker schema + 文档，改动面广；现阶段我们还不知道自部署用户分布 |
| demo 首问问卷 | 需要 onboarding UX 投入；等 demo 有 analytics 后再谈 |
| Plausible 自托管 | 运维负担 >> 当前数据量回报 |
| 自建 GEO LLM 轮询 | 与 Ahrefs Brand Radar 高度重叠 |

---

## 可观测性估算（PLAN-3 下的分层）

相比 PLAN-1，PLAN-3 的 Observed 层收缩，Unobservable 层扩张：

| 层 | PLAN-1 区间 | PLAN-3 区间 | 差异来源 |
|---|---|---|---|
| **Observed** | 25%~35% | **10%~20%** | 没有 demo pageview、没有 install_source、没有跨域串联 |
| **Recoverable** | 20%~30% | **5%~15%** | 没有首问问卷，补丁手段几乎只剩"issue 作者自报" |
| **Unobservable** | 40%~50% | **65%~80%** | AI 答案→安装的长链路完全看不到 |

**结论**：PLAN-3 只适合作为**学习阶段**的配置。部署 4-8 周后复盘：

- 如果 `/go/:target` 的 GitHub 点击量级证明 landing→GitHub 是主流量路径 → 按 PLAN-1 补齐
- 如果 Brand Radar 显示 OpenToggl 已在 AI 答案里被频繁提及 → 优先补 demo first-visit 问卷恢复来源
- 如果两者都没信号 → 说明上游曝光还不够，先回去做内容 / 外链，不是归因问题

---

## 优先级路线图

| 阶段 | 动作 | 工期 |
|---|---|---|
| **P0 Day 1-2** | Worker + 白名单 + landing 外链替换 + 上线 | 2 天 |
| **P0 Day 3** | SEO 周报脚本 + 第一次产出 | 1 天 |
| **P0 Day 4** | `geo-prompts.yaml` + Brand Radar 同步 + 第一次查询 | 半天 |
| **P0 Day 5** | 把三张周报汇总到 `docs/analytics/reports/INDEX.md` | 半天 |
| **观察窗** | 跑 4-8 周，累积数据 | 1-2 月 |
| **复盘** | 决定升级 PLAN-1 还是维持 PLAN-3 | 1 天 |

---

## 何时选 PLAN-3

- 团队本周就要开始拿数据，没有两周窗口做完整方案
- 想先验证 "landing 上的 CTA 到底有没有人点" 再决定要不要投入更大基建
- 团队对 Plausible / Brand Radar 都不熟，想先用最小动作建立感性认识

## 何时不选

- 已经确定要用 demo 承接转化并对 conversion 有 KPI → 直接上 PLAN-1
- 强隐私姿态是产品定位的核心 → 直接上 PLAN-2
- 有人投诉 "不知道哪个 CTA 有效" 已经超过 4 周没解决 → PLAN-3 的节奏太慢

---

## 升级路径

PLAN-3 → PLAN-1：按 PLAN-1 优先级路线图的 P1 开始补（跨域串联 → install_source → 首问问卷 → 仪表板）。PLAN-3 建的 `/go/:target` 与 `geo-prompts.yaml` 在 PLAN-1 里**直接复用**，没有返工。

PLAN-3 → PLAN-2：额外加一步"部署 Plausible + landing/demo 接入 + Ahrefs Web Analytics 下线"，其他一致。
