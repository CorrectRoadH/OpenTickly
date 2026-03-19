# Toggl Public Definition

## 目的

这份文档不是 PRD。

它的作用是把 Toggl 官方当前公开资料沉淀成一份本地定义来源，后续所有产品讨论、挑战、范围确认与实现拆解，都应该优先引用这份文档，而不是继续依赖口头表述。

这份文档同时承担“持续跟踪公开定义”的角色。也就是说，它不只是首版范围说明，还应该在后续 Toggl 官方公开资料变更时继续更新。

建议文档分层如下：

- `docs/core/product-definition.md`
  - 写产品目标、功能承诺、首版范围、非范围、待确认项
- `docs/core/toggl-public-definition.md`
  - 写 Toggl 官方公开 docs / OpenAPI 当前定义了什么
- `docs/upstream/toggl-official/`
  - 本地镜像的 Toggl 官方公开文档，作为后续 review context

## 当前公开定义来源

以当前仓库中的以下资料作为公开定义来源：

- `openapi/toggl-track-api-v9.swagger.json`
- `openapi/toggl-reports-v3.swagger.json`
- `openapi/toggl-webhooks-v1.swagger.json`
- `docs/reference/Toggl-API-分析.md`
- `docs/reference/Toggl-领域模型.md`
- `docs/reference/部署方案.md`
- `docs/upstream/toggl-official/engineering.toggl.com/docs/`

首版范围限定为“当前公开资料所定义的能力”。

首版发布后，OpenToggl 继续按 Toggl 的公开资料更新自己的定义，因此这份文档需要随着 Toggl 官方公开资料更新而持续演进，用于记录：

- 当前已对齐的官方公开能力
- 新增公开能力
- 已变化的公开能力
- 待补齐的定义差距

## 当前已镜像到本地的官方 Docs 范围

目前已经开始镜像并可作为本地上下文使用的官方文档范围至少包括：

- `docs/`
- `docs/authentication/`
- `docs/tracking/`
- `docs/organization/`
- `docs/workspace/`
- `docs/projects/`
- `docs/tags/`
- `docs/openapi/`
- `docs/api/me/`
- `docs/webhooks_start/`
- `docs/reports_start/`
- `docs/webhooks/`
- `docs/reports/`
- `docs/additional/`
- `docs/next/`

后续若镜像继续补全，以本地目录内容为准。

## 当前官方 Docs 覆盖面摘要

基于当前本地镜像目录，官方 docs 已覆盖的主要能力面包括：

- Getting Started
  - `Overview`
  - `Authentication`
  - `Tracking`
  - `Organization`
  - `Workspace`
  - `Projects`
  - `Tags`
  - `OpenAPI`
- Track API 主要资源页
  - `authentication`
  - `me`
  - `preferences`
  - `time_entries`
  - `organizations`
  - `invitations`
  - `groups`
  - `workspaces`
  - `clients`
  - `projects`
  - `tasks`
  - `tags`
  - `approvals`
- Reports
  - `summary_reports`
  - `detailed_reports`
  - `weekly_reports`
  - `saved_reports`
  - `insights`
  - `exports`
  - `utils`
- Webhooks
  - `subscriptions`
  - `event_filters`
  - `limits`
  - `ping`
  - `status`
  - `validate`
  - `authentication`
  - `request_examples`
  - `url_endpoint_validation`
  - `validating_received_events`
- 其他辅助文档
  - `v8_migration_guide`
  - `support`
  - `next/services`
  - `next/third_parties`

## 当前官方 Docs 的高概率缺口

当前本地 docs 更像官方主流程与主要资源页的镜像，而不是把 Track v9 Swagger 中全部 tag 都展开成独立可读页面。

结合 OpenAPI，当前高概率未在官方 docs 中形成完整独立章节，或至少不如 Swagger 完整的能力面包括：

- 计费与订阅相关
  - `subscription`
  - `organizations/subscription`
  - `subscriptions_legacy`
  - `user-invoices`
  - `promocode`
  - `setup_intent`
- 用户与日历相关
  - `users`
  - `calendar`
  - `favorites`
- 运营与管理相关
  - `goals`
  - `dashboard`
  - `alerts`
  - `timeline`
  - `audit_logs`
- 账户与辅助能力
  - `avatars`
  - `keys`
  - `integrations`
  - `feedback`
  - `smail`
- 基础字典与环境类
  - `countries`
  - `timezones`
  - `status`
- 工时约束类
  - `time_entry_constraints`
  - `workspaces/time_entry_constraints`

这意味着后续做端点矩阵时，不能把“官方 docs 没单独成章”误读成“这些功能不重要”。

## 解读原则

### 1. 公开 OpenAPI 是必要基线，不是充分基线

`OpenAPI` 决定：

- 路径
- HTTP 方法
- 参数
- schema
- 部分错误码

但它通常不能完整定义：

- 报表统计口径
- 限流与配额行为
- Webhook 运行时行为
- 验证与签名细节
- 部分权限与可见性边界
- 某些低频端点的业务前置条件

因此后续实现与 PRD 审查必须同时参考：

- OpenAPI
- 官方 docs 页面
- 本仓库整理的分析文档

对 Track API v9 尤其如此，因为 docs 的资源页覆盖面明显小于 Swagger 的完整 operation 面。

### 2. 文档优先于猜测

如果官方 docs 明确写了某项行为，则该行为应被视为公开合同的一部分。

如果官方 docs 未明确、OpenAPI 也未明确，则：

- 可以先写为待验证
- 不能伪造精确语义
- 必要时通过后续样本、真实响应、迁移数据或用户补充材料确认

### 3. 当前定义只针对公开产品面

当前公开定义包括：

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`
- 与这些 API 对应的公开产品功能

并且这种公开定义是持续更新的，不只是首版快照。

当前公开定义不包括：

- Toggl 官方 Web / Desktop / Mobile 客户端直接连接能力
- 未公开的私有接口
- 官方前端内部聚合接口

## 跟踪原则

OpenToggl 后续应按以下方式维护这份公开定义：

1. 持续跟踪 Toggl 官方公开 docs 与 OpenAPI 变更。
2. 先更新本基线文档，再更新 PRD 或实施计划。
3. 将变更分类为：
   - 新增公开能力
   - 已有能力的 schema 变更
   - 已有能力的行为/约束变更
   - 文档澄清但非行为变化
4. 对每项变更记录：
   - 官方来源
   - 影响模块
   - 对 OpenToggl 的定义影响
   - 当前状态：已落实 / 待落实 / 待确认

## 当前已确认的产品结论

这些结论已进入产品定义文档，并以本公开定义为依据：

- `OpenToggl` 首版直接按 Toggl 当前公开功能定义自己
- 首版完整覆盖 `Track API v9 + Reports API v3 + Webhooks API v1`
- Web 界面必须完整覆盖全部公开能力
- 云 SaaS 与自托管版功能面一致
- 账单、订阅、发票、配额、审计、导出、状态类能力也在范围内
- 首版唯一允许超出 Toggl 当前公开产品面的新增能力是 `import`
- `import` 目标是导入 Toggl 导出数据，并尽可能保留原始 ID

## 已识别的高风险语义区

这些区域即使 OpenAPI 存在，也不能只按 schema 理解：

### 1. Reports

- 时区切日
- rounding / rounding_minutes
- billable / non-billable totals
- 成员费率 / 项目费率 / fixed fee / currency
- profitability / insights 统计口径
- shared reports 权限行为
- 导出格式与边界条件

当前状态：

- `reports` 的官方 docs 和 OpenAPI 证据都较强
- 已经足够支持单独撰写 `docs/contracts/报表语义.md`
- 后续更适合继续做逐端点矩阵而不是泛泛讨论

### 2. Webhooks

- event filters 语义
- validate / ping 行为
- 签名模型
- 重试和退避策略
- delivery failure / disable 规则
- workspace 级限制

### 3. Billing / Subscription

- quota headers
- 计划与功能可用性表达
- payment required 等错误语义
- invoice / customer / subscription 状态对象

当前状态：

- `billing` 的公开 docs 说明明显弱于 reports
- 主要依赖 `openapi/toggl-track-api-v9.swagger.json`
- 因此在未获得更多公开行为样本前，应优先保证对象/端点/错误类别定义一致，而对少量运行时边界保持保守

### 4. Import

- Toggl 导出文件格式
- 字段映射规则
- 对象引用恢复规则
- 原始 ID 保留策略
- 局部失败和重试语义

## 目前我对这些资料的把握边界

目前可以明确说已经掌握得比较扎实的部分：

- Track / Reports / Webhooks 的公开资源面
- 主要领域对象与关系
- 官方 docs 中已经明确写出的认证、配额、限流、最终一致性、通用错误约束
- Reports 与 Webhooks 需要被视为独立产品面的结论

目前仍应保持保守、不应假装已经完全确定的部分：

- Toggl 导出文件的 import 细节
- 少量 billing/payment 的真实运行时边界
- 某些端点在文档未写透的具体错误文本或边角行为
- 某些只有真实请求样本才能确认的优先级规则

## 后续建议

下一步建议继续补三类文档：

1. `billing/import/export` 相关 PRD 细化
2. 逐对象矩阵
3. 逐端点矩阵

其中“逐端点矩阵”建议单独成文，而不要继续堆进产品定义正文。
