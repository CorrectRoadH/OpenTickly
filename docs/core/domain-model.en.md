# OpenToggl Domain Model

Based on the OpenAPI, Figma and corresponding PRDs, this document organizes the confirmed core domain model of `OpenToggl`.

This document not only defines the object list, but also directly constrains the implementation:

- Backend module boundaries must obey the context partitioning defined here
- Aggregate boundary and aggregate root definitions must obey the invariants stated here
- `backend-architecture.md` can only land these conclusions into code structure; it cannot reverse-modify them

## 0. Constraints on the Implementation

### Module Ownership

- `apps/backend/internal/<context>` must correspond to the business contexts defined here.
- A module cannot own the core business truth of another context.
- Where a product resource path is mounted under a noun does not equate to which module owns the business substance.

### Transactions and Aggregates

- A command's transaction boundary is by default organized around the aggregate roots defined here.
- If two objects only require eventual consistency, they should not be forced into the same aggregate for query convenience.
- Application may orchestrate cross-aggregate collaboration, but must not bypass aggregate roots to directly mutate internal members.

### Repository and Query

- Repositories are aggregate-root-facing by default.
- Query / read models are for lists, searches, aggregated statistics, reports, and projection views.
- For query convenience, the write path must not depend on the read model or write back business objects using aggregated statistical results.

### Cross-Module Collaboration

- One context must not directly depend on another context's `infra`.
- When one context reads another context's truth, it should go through an explicit port, query, or projection collaboration.
- When one context triggers a subsequent action in another context, it should prefer application orchestration or async tasks, not shared internal models.

## 1. Top-Level Domain Diagram

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

## 2. Bounded Contexts

### Identity

Responsible for:

- accounts
- login/session/token
- password reset
- user profiles

### Tenant Management

Responsible for:

- organizations
- workspaces
- relationships with billing plan, subscription, quota profile
- ownership / admin

Not responsible for:

- the business substance of plan / subscription / invoice / customer

### Billing

Responsible for:

- plans
- subscriptions
- invoices
- customer
- commercial quota policy
- feature exposure

### Access / Membership

Responsible for:

- organization users
- workspace users
- groups
- project members
- roles, visibility, rate and cost related permissions

### Work Catalog

Responsible for:

- clients
- projects
- tasks
- tags

### Tracking

Responsible for:

- time entries
- running timer
- expenses
- favorites
- goals
- reminders

### Governance

Responsible for:

- approvals
- timesheets
- audit logs
- API quota / rate limit
- retention / policy

Notes:

- `quota` here means API quota / rate limit.
- Commercial plans, seat limits, and feature gating do not belong to Governance — they belong to Billing.

### Operational Integrations

Responsible for:

- webhook delivery
- export jobs
- file attachments

Notes:

- This is a domain-concept cluster; it doesn't necessarily translate to a single `integrations/` code module in the end.
- The final code-module boundaries are governed by `docs/core/codebase-structure.md` and `docs/core/backend-architecture.md`.

### Analytics

Responsible for:

- detailed reports
- summary reports
- weekly reports
- saved reports
- insights / profitability / trends

### Instance Administration

Responsible for:

- instance admin
- registration policy
- instance-level settings
- maintenance mode
- platform stats / health

Notes:

- This set of capabilities is not part of the Toggl public contract.
- At the code level, it is owned by the independent top-level module `instance-admin`, with technical implementation supported by `platform`.
- Reasons for splitting it into an independent module: scope (instance-level vs workspace-level), API contract source (`opentoggl-admin` vs `toggl-*`), and responsibility (platform operations vs business governance) all differ from `governance`.

## 3. Core Aggregate Roots

The most important aggregate roots are suggested as:

- `User`
- `Organization`
- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookSubscription`
- `SavedReport`
- `RegistrationPolicy`
- `InstanceSetting`

These objects share the following traits:

- Appear directly in the public API
- Change frequently
- Have a clear governing influence over other models

### Aggregate Boundaries and Core Invariants

#### `Workspace`

Aggregate boundary:

- workspace basic attributes
- workspace-level settings
- workspace branding reference
- ownership relationship with organization

Core invariants:

- A workspace must belong to an organization
- Workspace-level settings must stay internally consistent within a single modification
- The rounding switch and rounding_minutes must be consistent
- The default currency, time display, and default policy fields must be fully parseable

Reference-consistency checks performed at the application boundary:

- The ownership relationship between workspace and the current organization
- The plan / subscription view references exposed on workspace

#### `Project`

Aggregate boundary:

- project basic attributes
- project state
- project default policy
- project-level attributes such as billable / private / pinned / rate / fixed_fee / currency

Not automatically included inside the aggregate:

- `ProjectUser`
- `ProjectGroup`
- `Task`

Core invariants:

- A project's archived, active, private, billable and other states must be consistent
- Changes to a project's default policy must be made through the `Project` itself
- Combinations of fixed_fee, rate, currency, billable related fields must be consistent
- An archived project must not be in a state that conflicts with active

Reference-consistency checks performed at the application boundary:

- A project must belong to a workspace
- Whether task / project member / project group associations are legal
- Whether feature gating allows the current plan to create or modify this kind of project

#### `TimeEntry`

Aggregate boundary:

- time entry basic fields
- start / stop / duration
- references to project / task / tag
- fact fields such as billable / description / source

Core invariants:

- A stopped `TimeEntry` cannot be stopped again
- running / stopped state must be consistent
- The semantics of duration and start / stop in the public definition must be consistent
- In the stopped state, `stop >= start`
- In the running state, `stop = null`
- The user / workspace reference cannot be null

Cross-aggregate constraints:

- "Under the same workspace, the same user cannot run multiple timers simultaneously" is a cross-aggregate constraint
- This kind of rule is coordinated and checked by `application`, supported via domain policy / query port, not completed by a single `TimeEntry` aggregate alone
- Whether project / task / tag exist and whether they belong to the same workspace is also an application-boundary reference consistency check

#### `WebhookSubscription`

Aggregate boundary:

- subscription basic attributes
- callback URL
- enabled / validated / failure state
- filter configuration

Core invariants:

- The validated state and deliverable state must be consistent
- The filter configuration must remain legal

#### `SavedReport`

Aggregate boundary:

- saved/shared report basic attributes
- token
- access mode
- default parameters

Core invariants:

- The access mode of a shared token must be consistent
- The fallback rules for saved/default parameters must be fixed

#### `RegistrationPolicy`

Aggregate boundary:

- open registration
- closed registration
- invite-only registration

Core invariants:

- An instance may only be in one primary registration policy at any moment

#### `InstanceSetting`

Aggregate boundary:

- instance-level provider configuration references
- instance-level security and maintenance switches

Core invariants:

- The configuration set must be fully parseable
- High-risk configuration changes must be audited

## 4. Relationship Model

```text
User 1---* OrganizationMember *---1 Organization
User 1---* WorkspaceUser       *---1 Workspace
Organization 1---* Group
Group *---* User      (via GroupMember)
Group *---* Workspace (via GroupWorkspace)
Workspace 1---* Client
Workspace 1---* Project
Project 1---* Task
Workspace 1---* Tag
Project *---* User  (via ProjectUser)
Project *---* Group (via ProjectGroup)
Workspace 1---* TimeEntry
TimeEntry *---* Tag
TimeEntry *---1 Project
TimeEntry *---1 Task
TimeEntry *---1 User
Workspace 1---* WebhookSubscription
Workspace 1---* SavedReport
```

For `Instance Administration`, the current relationships are expressed at instance-level scope, not mapped under a workspace:

- `InstanceAdmin` manages the instance-level entry
- `RegistrationPolicy` describes the instance-level registration policy
- `InstanceSetting` describes the instance-level configuration
- `MaintenanceMode` describes the instance-level maintenance state
- `PlatformStat` is the instance-level statistics and diagnostics view

Notes:

- `ProjectUser`, `ProjectGroup`, and `Task` have strong associations with `Project`, but are not automatically treated as internal members of the `Project` aggregate
- Whether these objects are implemented via separate aggregates or dependent entities is determined by concrete use cases and invariants

## 5. Suggested Storage Model

### 5.1 OLTP Database

PostgreSQL is recommended as the transactional source of truth.

#### Tenant tables

- `users`
- `organizations`
- `workspaces`

#### Membership tables

- `organization_members`
- `workspace_members`
- `groups` (organization-scoped)
- `group_members` (user ↔ group N:N)
- `group_workspaces` (group ↔ workspace N:N)

#### Catalog tables

- `clients`
- `projects`
- `tasks`
- `tags`
- `project_users`
- `project_groups`

#### Fact tables

- `time_entries`
- `time_entry_tags`
- `expenses`
- `approvals`
- `approval_items`
- `favorites`
- `goals`
- `audit_logs`

#### Billing tables

- `plans`
- `subscriptions`
- `customers`
- `invoices`

#### Operational Integration tables

- `calendar_integrations`
- `calendars`
- `calendar_events`
- `webhook_subscriptions`
- `webhook_subscription_filters`
- `webhook_deliveries`
- `webhook_delivery_attempts`
- `export_jobs`
- `files`

### 5.2 Suggested `time_entries` table

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

### Notes

- Keeping both `organization_id` and `workspace_id` helps with multi-tenant isolation and billing/reporting.
- `stop_at = null` can represent a running timer.
- When `duration_seconds` cannot be fully derived from `start/stop`, it is also allowed to be kept as a public contract field.

### 5.3 Suggested `time_entry_tags` table

```sql
create table time_entry_tags (
  time_entry_id bigint not null references time_entries(id),
  tag_id bigint not null,
  primary key (time_entry_id, tag_id)
);
```

### 5.4 Suggested membership tables

#### `workspace_users`

Must at minimum carry:

- `workspace_id`
- `user_id`
- `role`
- `hourly_rate`
- `labor_cost`
- `is_active`
- `created_at`
- `updated_at`

#### `project_users`

Must at minimum carry:

- `project_id`
- `user_id`
- `is_manager`
- `created_at`

### 5.5 Suggested webhook tables

#### `webhook_subscriptions`

Must at minimum carry:

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

Must at minimum carry:

- `subscription_id`
- `entity_type`
- `action`

#### `webhook_deliveries`

Must at minimum carry:

- `id`
- `subscription_id`
- `event_id`
- `payload`
- `status`
- `created_at`

#### `webhook_delivery_attempts`

Must at minimum carry:

- `id`
- `delivery_id`
- `attempt_no`
- `http_status`
- `response_excerpt`
- `failed_at`

## 6. Analytics Model

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

## 7. Suggested API Layering

### Core Transaction API

Responsible for:

- identity
- tenant resources
- memberships
- clients/projects/tasks/tags
- time entries
- approvals
- billing core facts

### Reports API

Responsible for:

- all reports
- shared / saved reports
- exports
- filters / search utils

### Webhooks API

Responsible for:

- subscriptions
- validate / ping
- limits / status

### Identity API

Responsible for:

- auth
- account
- session / token

## 8. Design Principles to Preserve

- `workspace` is the main business boundary
- `organization` is the main governance and subscription attachment point on the public product surface, but does not equate to a standalone code module
- `membership` is a first-class business object
- `reports` is an independent read model
- `webhooks` is an independent runtime model
- `time_entries` is the core fact object
- The external public contract takes precedence over internal implementation convenience
