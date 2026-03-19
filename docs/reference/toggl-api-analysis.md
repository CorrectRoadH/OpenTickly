# Toggl API 分析

## 资料来源

本分析基于 Toggl 官方公开资料：

- Toggl Engineering Docs
- Track API v9 Swagger
- Reports API v3 Swagger
- Webhooks API v1 Swagger

目标不是复述官方文档，而是提炼出对 `OpenToggl` 有价值的产品边界、领域对象和架构信号。

## 公开 API 总览

### Track API v9

Track API v9 是最大的一块公开 API 面，覆盖面明显超出“时间记录 CRUD”。

从公开规格可以看出，它至少包含以下能力域：

- `me` 与用户偏好
- 身份与认证
- time entries
- organizations
- workspaces
- invitations
- groups
- clients
- projects
- tasks
- tags
- approvals
- expenses
- goals
- favorites
- calendar / integrations
- dashboard / timeline
- audit logs
- exports
- billing / subscription / invoices / customer / quota

这个结构说明：Toggl 的公开产品面本质上是一个完整的业务平台，而不是单点计时工具。

### Reports API v3

Reports API v3 明显是独立读模型：

- detailed reports
- summary reports
- weekly reports
- data trends
- profitability
- insights
- saved reports
- shared reports
- exports
- filters / search utils

它不是 Track API 的“附加列表接口”，而是一套单独的查询与导出合同。

### Webhooks API v1

Webhooks API v1 公开面虽然更小，但行为要求更强：

- subscriptions
- event filters
- validate
- ping
- limits
- status

这说明 webhook 在 Toggl 中也是正式产品面，而不是简陋回调。

## 外部 API 风格

### 认证

官方公开资料至少明确了三种方式：

- `Basic auth(email:password)`
- `Basic auth(api_token:api_token)`
- 基于会话 cookie 的访问

这意味着认证方式本身就是兼容合同的一部分。

### 数据格式

- 主要使用 JSON
- 时间以 RFC3339 风格表示
- 存储与展示之间存在 UTC / 时区转换语义

### 配额与限流

官方资料明确存在两层控制：

1. Product quota

- 与组织套餐相关
- 通过 `X-Toggl-Quota-Remaining`
- 通过 `X-Toggl-Quota-Resets-In`

2. Technical rate limit

- 超限返回 `429`
- 安全窗口大致可按 `1 req/sec` 理解

### 最终一致性

官方总览页明确提到事件驱动与最终一致性。

这意味着：

- 新建实体后不能默认立即在所有读取面可见
- 会话状态和权限状态可能有短暂传播延迟
- 某些写后读行为需要重试或等待

这个信号对 `reports`、`webhooks`、`authorization` 都很重要。

## 推断出的顶层服务结构

从公开 API 形态看，Toggl 至少可以抽象为以下服务集合：

1. Identity / Accounts
2. Organization Management
3. Workspace Management
4. Tracking
5. Work Catalog
6. Membership / Access Control
7. Approvals / Governance
8. Reports / Analytics
9. Webhooks
10. Billing / Subscription
11. Export / Files / Attachments
12. Meta / Quota / Status

这些边界与我们当前的 PRD 和兼容合同文档是一致的。

## 关键设计观察

### 1. Workspace 是主要业务租户边界

大多数核心业务对象都明显围绕 workspace 展开：

- time entries
- projects
- tasks
- tags
- clients
- reports
- webhooks

因此，`workspace` 应被视为 OpenToggl 领域建模中的一级核心边界。

### 2. Organization 是治理与计费边界

组织公开面明显承担以下责任：

- 订阅与套餐
- 账单与发票
- 组织成员与治理
- 多工作区管理
- owner / admin 语义

因此 organization 不能被弱化为“工作区分组”。

### 3. Reports 是独立读 API

这可能是最重要的架构线索之一。

公开资料表明 reports 具有：

- 独立 base path
- 独立导出
- 独立 shared/saved model
- 独立 filters/search model
- 独立分页与统计语义

因此 `reports` 更像分析读模型，而不是事务库上的临时 SQL。

### 4. Webhooks 是独立运行时产品面

公开资料不只暴露 subscription CRUD，还暴露：

- validate
- ping
- limits
- status
- event filters

这说明 webhook 不是“监听数据库变更后发 POST”那么简单。

### 5. Membership 是一等业务对象

公开面中的下列对象并不只是 join table：

- OrganizationUser
- WorkspaceUser
- Group
- GroupMember
- ProjectUser
- ProjectGroup

这些对象与权限、费率、可见性、私有项目等规则紧密相关。

## 公开规格中反复出现的核心业务对象

### User

典型字段包括：

- `id`
- `email`
- `fullname`
- `timezone`
- `default_workspace_id`
- `api_token`
- `2fa_enabled`

### Organization

典型字段包括：

- `id`
- `name`
- `pricing_plan_id`
- `pricing_plan_name`
- `owner`
- `subscription`
- `trial_info`

### Workspace

典型字段包括：

- `id`
- `organization_id`
- `name`
- `default_currency`
- `default_hourly_rate`
- `rounding`
- `rounding_minutes`
- `projects_billable_by_default`
- `projects_private_by_default`
- `subscription`

### Project

典型字段包括：

- `id`
- `workspace_id`
- `client_id`
- `name`
- `active`
- `billable`
- `color`
- `currency`
- `estimated_seconds`
- `actual_seconds`
- `fixed_fee`
- `rate`

### Task / Tag / Client

这几个对象虽然简单，但都属于正式公开目录层，不可省略。

### TimeEntry

时间记录是最核心的事实对象，至少涉及：

- workspace
- user
- project
- task
- client
- tags
- start / stop / duration
- billable
- running timer 语义

### WebhookSubscription

公开面明确要求它具备：

- workspace 归属
- event filters
- validate / ping 生命周期
- limits
- status

## Webhook 行为暴露出的架构信号

从公开资料看，Webhook 至少具有：

- 订阅管理
- 过滤
- 验证
- 限制
- 状态检查

这意味着 OpenToggl 也应把 Webhook 当成一等运行时能力，而不是内部附属脚本。

## 对开源兼容实现最重要的保留项

如果要做一个真正的 `OpenToggl`，最需要保留的不是某一两个 CRUD，而是这些外部合同：

- 认证方式
- workspace / organization 双层边界
- membership 语义
- running timer 语义
- reports 独立读模型
- webhooks 独立运行时模型
- billing / quota / feature gating
- shared reports / exports
- 最终一致性与重试边界

## 结论

从公开 API 看，Toggl 的核心不是“记录工时”本身，而是：

- 一个以 workspace 为中心的事务域
- 一个以 reports 为中心的分析域
- 一个以 webhooks 为中心的集成域
- 一个以 subscription / quota 为中心的商业域

这也是为什么 `OpenToggl` 不能只做 core CRUD，而必须同时把 `reports`、`webhooks`、`billing` 当成正式产品面来定义。
