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

Integrations
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
- plans / subscription
- ownership / admin

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
- quota / retention / policy

### Integrations

负责：

- webhooks
- calendar sync
- exports
- file attachments

### Analytics

负责：

- detailed reports
- summary reports
- weekly reports
- saved reports
- insights / profitability / trends

## 3. 核心聚合根

最重要的聚合根建议如下：

- `User`
- `Organization`
- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookSubscription`
- `SavedReport`

这些对象的共同特点是：

- 直接出现在公开 API 中
- 变化频繁
- 对其他模型有明显支配作用

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

## 5. 建议存储模型

### 5.1 OLTP 数据库

推荐 PostgreSQL 作为事务真相源。

#### Tenant 表

- `users`
- `organizations`
- `organization_users`
- `workspaces`
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

#### Integration 表

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

## 6. 事件模型

建议显式定义领域事件，而不是让外部行为直接耦合数据库变化。

典型事件包括：

- `user.created`
- `workspace.created`
- `project.created`
- `project.updated`
- `time_entry.created`
- `time_entry.updated`
- `time_entry.stopped`
- `subscription.updated`
- `webhook.subscription.created`

这些事件会同时服务于：

- reports 投影
- webhook fanout
- audit log
- 缓存刷新

## 7. Outbox 模式

建议所有关键写操作都写入 outbox，再由后台 worker 异步处理：

1. 事务写入主表
2. 同事务写入 outbox
3. worker 消费 outbox
4. 更新：
   - analytics projections
   - webhook delivery
   - audit trail
   - caches

这与官方公开资料中暴露出的最终一致性信号是匹配的。

## 8. Analytics 模型

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

## 9. API 分层建议

### Core Transaction API

负责：

- identity
- organizations
- workspaces
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

## 10. 需要保留的设计原则

- `workspace` 是主要业务边界
- `organization` 是治理与计费边界
- `membership` 是一等业务对象
- `reports` 是独立读模型
- `webhooks` 是独立运行时模型
- `time_entries` 是核心事实对象
- 外部兼容合同优先于内部实现便利
