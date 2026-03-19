# OpenToggl 领域模型

本文档基于 Toggl 公开 API 面，整理 `OpenToggl` 应采用的核心领域模型。

## 1. 顶层领域图

```text
Identity
└── User

Tenant
├── Organization
└── Workspace

Membership
├── OrganizationUser
├── WorkspaceUser
├── Group
├── GroupMember
├── ProjectUser
└── ProjectGroup

Work Catalog
├── Client
├── Project
├── Task
└── Tag

Tracking
├── TimeEntry
├── Expense
├── Favorite
├── Goal
└── Reminder

Governance
├── Approval
├── Timesheet
├── AuditLog
└── QuotaPolicy / RetentionPolicy

Operational Integrations
├── CalendarIntegration
├── Calendar
├── CalendarEvent
├── WebhookSubscription
├── WebhookDelivery
└── ExportJob

Analytics
├── DetailedReport
├── SummaryReport
├── WeeklyReport
├── SavedReport
└── Insight

Instance Administration
├── InstanceAdmin
├── RegistrationPolicy
├── InstanceSetting
├── MaintenanceMode
└── PlatformStat
```

## 2. 限界上下文

### Identity

负责：

- 账户
- 登录/会话/token
- 密码重置
- 用户资料

### Tenant Management

负责：

- organizations
- workspaces
- 与 billing plan、subscription、quota profile 的关联关系
- ownership / admin

不负责：

- plan / subscription / invoice / customer 的业务本体

### Billing

负责：

- plans
- subscriptions
- invoices
- customer
- commercial quota policy
- feature exposure

### Access / Membership

负责：

- organization users
- workspace users
- groups
- project members
- 角色、可见性、费率与成本相关权限

### Work Catalog

负责：

- clients
- projects
- tasks
- tags

### Tracking

负责：

- time entries
- running timer
- expenses
- favorites
- goals
- reminders

### Governance

负责：

- approvals
- timesheets
- audit logs
- API quota / rate limit
- retention / policy

说明：

- 这里的 quota 指 API quota / rate limit。
- 商业计划、seat 限制、feature gating 不属于 Governance，而属于 Billing。

### Operational Integrations

负责：

- calendar sync
- webhook delivery
- export jobs
- file attachments

说明：

- 这里是领域概念上的聚类，不等于最终代码模块一定存在单独的 `integrations/` 目录。
- 最终代码模块边界以 `docs/codebase-structure.md` 为准。

### Analytics

负责：

- detailed reports
- summary reports
- weekly reports
- saved reports
- insights / profitability / trends

### Instance Administration

负责：

- instance admin
- registration policy
- instance-level settings
- maintenance mode
- platform stats / health

说明：

- 这一组能力不属于 Toggl 兼容合同。
- 当前代码归属优先落在 `governance`，技术实现由 `platform` 支撑。
- 这里是领域概念上的实例级子域，不表示当前代码必须单独拆出顶层模块。

## 3. 核心聚合根

最重要的聚合根建议如下：

- `User`
- `Organization`
- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookSubscription`
- `SavedReport`
- `RegistrationPolicy`
- `InstanceSetting`

这些对象的共同特点是：

- 直接出现在公开 API 中
- 变化频繁
- 对其他模型有明显支配作用

### 聚合边界与核心不变量

#### `Workspace`

聚合边界：

- workspace 基本属性
- workspace 级设置
- workspace branding 引用
- 与 organization 的归属关系

核心不变量：

- workspace 必须从属于一个 organization
- workspace 级设置在单次修改中必须保持自洽
- rounding 开关与 rounding_minutes 必须自洽
- 默认币种、时间显示、默认策略字段必须可被完整解析

在应用边界检查的引用一致性：

- workspace 与当前 organization 的归属关系
- workspace 上暴露的 plan / subscription 视图引用

#### `Project`

聚合边界：

- project 基本属性
- project 状态
- project 默认策略
- billable / private / pinned / rate / fixed_fee / currency 等项目级属性

不自动纳入聚合内部：

- `ProjectUser`
- `ProjectGroup`
- `Task`

核心不变量：

- project 的归档、激活、private、billable 等状态必须自洽
- project 默认策略变更必须通过 `Project` 自身完成
- fixed_fee、rate、currency、billable 相关字段组合必须自洽
- archived project 不能处于与 active 冲突的状态

在应用边界检查的引用一致性：

- project 必须从属于一个 workspace
- task / project member / project group 关联是否合法
- feature gating 是否允许当前 plan 创建或变更该类 project

#### `TimeEntry`

聚合边界：

- time entry 基本字段
- start / stop / duration
- 与 project / task / tag 的引用
- billable / description / source 等事实字段

核心不变量：

- 已停止的 `TimeEntry` 不能再次停止
- running / stopped 状态必须一致
- duration 与 start / stop 的兼容语义必须一致
- stopped 状态下 `stop >= start`
- running 状态下 `stop = null`
- user / workspace 引用不能为空

跨聚合约束：

- “同一 workspace 下同一用户不能同时运行多个 timer” 属于跨聚合约束
- 这类规则由 `application` 协调检查，通过 domain policy / query port 支撑，不由单个 `TimeEntry` 聚合独立完成
- project / task / tag 是否存在、是否属于同一 workspace，也属于应用边界检查的引用一致性

#### `WebhookSubscription`

聚合边界：

- subscription 基本属性
- callback URL
- enabled / validated / failure 状态
- filter 配置

核心不变量：

- validated 状态与可投递状态必须一致
- filter 配置必须保持合法

#### `SavedReport`

聚合边界：

- saved/shared report 基本属性
- token
- access mode
- 默认参数

核心不变量：

- shared token 的访问模式必须一致
- saved/default 参数回落规则必须固定

#### `RegistrationPolicy`

聚合边界：

- 开放注册
- 关闭注册
- 仅邀请注册

核心不变量：

- 一个实例在任一时刻只能处于一种主注册策略

#### `InstanceSetting`

聚合边界：

- 实例级 provider 配置引用
- 实例级安全与维护开关

核心不变量：

- 配置集合必须可被完整解析
- 高风险配置变更必须受审计

## 4. 关系模型

```text
User 1---* OrganizationUser *---1 Organization
User 1---* WorkspaceUser    *---1 Workspace
Workspace 1---* Group
Group 1---* GroupMember *---1 User
Workspace 1---* Client
Workspace 1---* Project
Project 1---* Task
Workspace 1---* Tag
Project 1---* ProjectUser *---1 User
Workspace 1---* TimeEntry
TimeEntry *---* Tag
TimeEntry *---1 Project
TimeEntry *---1 Task
TimeEntry *---1 User
Workspace 1---* WebhookSubscription
Workspace 1---* SavedReport
```

对于 `Instance Administration`，当前关系以实例级作用域表达，不映射到 workspace 之下：

- `InstanceAdmin` 管理实例级入口
- `RegistrationPolicy` 描述实例级注册策略
- `InstanceSetting` 描述实例级配置
- `MaintenanceMode` 描述实例级维护状态
- `PlatformStat` 是实例级统计与诊断视图

说明：

- `ProjectUser`、`ProjectGroup`、`Task` 与 `Project` 有强关联，但当前不自动视为 `Project` 聚合内部成员
- 这些对象是否通过单独聚合还是从属实体实现，以具体用例与不变量为准

## 5. 建议存储模型

### 5.1 OLTP 数据库

推荐 PostgreSQL 作为事务真相源。

#### Tenant 表

- `users`
- `organizations`
- `workspaces`

#### Membership 表

- `organization_users`
- `workspace_users`
- `roles`
- `groups`
- `group_members`

#### Catalog 表

- `clients`
- `projects`
- `tasks`
- `tags`
- `project_users`
- `project_groups`

#### Fact 表

- `time_entries`
- `time_entry_tags`
- `expenses`
- `approvals`
- `approval_items`
- `favorites`
- `goals`
- `audit_logs`

#### Billing 表

- `plans`
- `subscriptions`
- `customers`
- `invoices`

#### Operational Integration 表

- `calendar_integrations`
- `calendars`
- `calendar_events`
- `webhook_subscriptions`
- `webhook_subscription_filters`
- `webhook_deliveries`
- `webhook_delivery_attempts`
- `export_jobs`
- `files`

### 5.2 推荐的 `time_entries` 表

```sql
create table time_entries (
  id bigserial primary key,
  organization_id bigint not null,
  workspace_id bigint not null,
  user_id bigint not null,
  project_id bigint null,
  task_id bigint null,
  client_id bigint null,

  description text,
  billable boolean not null default false,

  start_at timestamptz not null,
  stop_at timestamptz null,
  duration_seconds integer not null,

  source varchar(32) not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
```

### 说明

- `organization_id` 与 `workspace_id` 同时保留，有利于多租户隔离与 billing/reporting。
- `stop_at = null` 可表示 running timer。
- `duration_seconds` 不能完全由 `start/stop` 推导时，也允许作为兼容字段保留。

### 5.3 推荐的 `time_entry_tags` 表

```sql
create table time_entry_tags (
  time_entry_id bigint not null references time_entries(id),
  tag_id bigint not null,
  primary key (time_entry_id, tag_id)
);
```

### 5.4 推荐的 membership 表

#### `workspace_users`

至少应承载：

- `workspace_id`
- `user_id`
- `role`
- `hourly_rate`
- `labor_cost`
- `is_active`
- `created_at`
- `updated_at`

#### `project_users`

至少应承载：

- `project_id`
- `user_id`
- `is_manager`
- `created_at`

### 5.5 推荐的 webhook 表

#### `webhook_subscriptions`

至少应承载：

- `id`
- `workspace_id`
- `callback_url`
- `secret`
- `enabled`
- `validated_at`
- `last_failure_at`
- `consecutive_failures`
- `created_at`
- `updated_at`

#### `webhook_subscription_filters`

至少应承载：

- `subscription_id`
- `entity_type`
- `action`

#### `webhook_deliveries`

至少应承载：

- `id`
- `subscription_id`
- `event_id`
- `payload`
- `status`
- `created_at`

#### `webhook_delivery_attempts`

至少应承载：

- `id`
- `delivery_id`
- `attempt_no`
- `http_status`
- `response_excerpt`
- `failed_at`

## 6. Analytics 模型

### Dimensions

- user
- organization
- workspace
- client
- project
- task
- tag
- date / week / month

### Facts

- fact_time_entries
- fact_billable_amounts
- fact_costs

### Aggregates / Projections

- detailed report rows
- summary aggregates
- weekly buckets
- profitability projections
- insights projections

## 7. API 分层建议

### Core Transaction API

负责：

- identity
- tenant resources
- memberships
- clients/projects/tasks/tags
- time entries
- approvals
- billing 基础事实

### Reports API

负责：

- 所有报表
- shared / saved reports
- exports
- filters / search utils

### Webhooks API

负责：

- subscriptions
- validate / ping
- limits / status

### Identity API

负责：

- auth
- account
- session / token

## 8. 需要保留的设计原则

- `workspace` 是主要业务边界
- `organization` 是公开产品面上的主要治理与订阅挂载点，但不等于单独代码模块
- `membership` 是一等业务对象
- `reports` 是独立读模型
- `webhooks` 是独立运行时模型
- `time_entries` 是核心事实对象
- 外部兼容合同优先于内部实现便利
