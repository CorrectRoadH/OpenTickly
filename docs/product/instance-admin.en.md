# Instance Admin / Platform Operations

## Goal

`OpenToggl` is not just a set of business features; it also needs to be deployed and operated as a runnable, governable, and maintainable instance.

This means that in addition to Toggl's public product surface and `import`, there is another class of independent product capability:

- Site admin / instance administrator capability in the self-hosted scenario
- Platform administrator / operations backend capability in the SaaS scenario

These capabilities do not belong to Toggl's public product surface itself, but they determine:

- Whether an instance can be safely initialized
- Whether to allow open registration
- How to manage instance-level users and permissions
- How to configure instance-level dependencies such as SMTP, payment, storage, SSO, etc.
- How to observe instance health, task backlog, error rate, and resource usage

If this class of capability is not defined as a formal product surface, OpenToggl is left with only business features and lacks the host capability to actually run an OpenToggl site.

## Scope

This PRD covers:

- First administrator bootstrap
- Registration strategy and invitation strategy
- Instance-level user governance
- Instance-level configuration
- Instance-level statistics, health status, and diagnostics
- Instance-level security, audit, and maintenance entry points
- Common platform administration capabilities shared across the self-hosted and SaaS deployment models

This document does not cover:

- The Toggl public API itself
- Ordinary usage flows for business objects such as organizations / workspaces / projects / time entries
- Implementation details of payment gateways, storage, email, etc.
- Specific deployment scripts and operations manuals

## Product Rules

- `Instance Admin / Platform Operations` is a native product surface of `OpenToggl`.
- It does not belong to Toggl's public product surface itself.
- It covers both the site admin capability of self-hosted and the platform administration capability of SaaS.
- The two share the same conceptual model, and only differ in permission source, default strategy, and execution environment.

## Authority Boundary

The authority boundary of instance administrator / platform administrator is defined as follows:

- Allowed:
  - Manage instance-level registration strategy
  - Manage instance-level configuration
  - Manage instance-level health, statistics, maintenance, and audit entry points
  - Disable or restore instance-level users
  - Handle cross-tenant security, abuse, and operational incidents
- Not allowed by default:
  - Directly modify ordinary business fields of business objects within tenants
  - Bypass the business permission model to directly operate on time entry / project / report business content
  - Treat instance-level management entry points as a general-purpose super-admin backdoor

If stronger cross-tenant business intervention capability needs to be introduced later, it should be defined separately as an audited high-privilege operation, rather than implicitly included in the default permissions of instance administrator.

## Edge Cases

- Instance administrators may not by default treat instance-level entry points as a super backdoor into business objects; if cross-tenant forced intervention is really needed, it must be exposed as a separate audited operation.
- Self-hosted and SaaS may differ in provider defaults and operations approaches, but the external product surface must not become two different products.
- States such as configuration errors, provider failures, background task backlog, and maintenance mode being enabled must be visible through formal status pages or diagnostic entry points, not only in logs.
- Once bootstrap completes, subsequent repeated bootstrap must be explicitly blocked, not silently overwrite the first administrator.
- Self-hosted first-admin initialization must be based on the premise that the formal PostgreSQL schema has been finalized through `pgschema`; it is not allowed to replace the formal init flow with manual table creation, ad hoc SQL, or manual database edits.

## User Roles

### 1. Instance Owner

Applies to:

- self-hosted site admin
- Single-tenant instance owner

Concerns:

- Whether the instance can be initialized
- Whether registration and invitations can be controlled
- Whether site dependencies can be configured
- Whether health status and errors can be seen

### 2. Platform Operator

Applies to:

- SaaS platform administrator
- Operations and support team

Concerns:

- Global user governance
- Platform-level statistics and diagnostics
- Platform-level security and maintenance
- Cross-tenant exception handling

## User Stories

1. As a self-hosted site admin, I want to be able to create the first administrator account on the first instance startup, so that I can take over the whole site.
2. As a self-hosted site admin, I want to control strategies such as open registration, closed registration, and invite-only registration, so that I can manage the entry point according to site needs.
3. As a platform administrator, I want to view user count, activity, task backlog, and error rate at the instance level, so that I can operate the entire platform.
4. As a platform administrator, I want to disable or restore a certain instance-level user, so that I can handle abuse, compliance, or security incidents.
5. As a site admin, I want to configure instance-level providers such as SMTP, object storage, payment, SSO, and OAuth, so that business features can run normally.
6. As a site admin, I want to view instance health, background job status, and key diagnostic information without modifying the database, so that I can maintain the service.
7. As a platform administrator, I want to see the global health status of asynchronous systems such as webhook, reports, and import, so that I can quickly locate problems.
8. As a site admin, I want to enable read-only or maintenance mode during the maintenance window, so that I can safely upgrade the system.
9. As a platform administrator, I want instance-level audit logs to be queryable, so that I can trace registration strategy changes, configuration changes, and high-privilege operations.
10. As a site admin, I want the self-hosted edition to run the full product capability via BYO providers, without being forced to depend on official SaaS infrastructure.

## Capability Matrix

### 1. Bootstrap

Must cover:

- First startup detection
- First administrator creation
- Bootstrap completion status
- Semantics for preventing repeated bootstrap

### 2. Access & Registration Policy

Must cover:

- Open registration
- Closed registration
- Invite-only registration
- Whether the first user auto-creates a personal workspace / organization strategy
- Registration page and related error semantics

### 3. Instance User Governance

Must cover:

- Instance-level user list
- Search and filter
- Disable / restore
- High-privilege user marker
- User status diagnostics

### 4. Instance Configuration

Must cover:

- SMTP configuration
- Storage configuration
- Payment / billing provider configuration
- OAuth / SSO provider configuration
- Security-related basic policy configuration

Notes:

- These capabilities are product entry points; they do not define the underlying provider SDK or secret storage details.
- These entry points belong to instance-level product capability, not business capabilities owned by `platform` itself.
- But the schema, bootstrap guard, and initialization order they depend on must be a formal part of product delivery; self-hosted must not require operators to manually backfill database objects before entering these entry points.

### 5. Ops & Health

Must cover:

- Instance health status
- status / meta
- Background job backlog
- System-level status of reports / webhooks / import
- Error and alert entry points
- Key statistics overview

### 6. Security & Audit

Must cover:

- High-privilege operation audit
- Configuration change audit
- Registration strategy change audit
- Instance-level security incident entry point

### 7. Maintenance Controls

Must cover:

- Maintenance mode or equivalent entry point
- Read-only mode or equivalent entry point
- Background task pause / resume entry point
- User-visible expression of key maintenance states

## Self-Hosted vs SaaS

### Commonalities

Both deployment models must have:

- bootstrap / admin capability
- Registration and invitation strategy
- Instance-level configuration entry point
- Health status and diagnostics entry point
- Instance-level audit capability
- Formal schema management path; on PostgreSQL, consistently use `pgschema` to manage desired state, review changes, and apply schema

### Differences

Parts allowed to differ:

- Permission source
  - self-hosted: the site admin owns instance control
  - SaaS: the platform administrator or internal operations role owns platform control
- Provider defaults
  - self-hosted allows BYO
  - SaaS can pre-provision official providers
- Operations implementation
  - self-hosted can be maintained via a single machine or Compose
  - SaaS can rely on managed platforms and centralized operations

## Open Questions

- The minimum set of some platform-level statistics metrics and health diagnostic items still needs further convergence.
- Whether to build stronger cross-tenant business intervention capability as a separate group of high-privilege operations is to be decided later.

## Web Requirements

The web side must completely carry the formal product capabilities of `Instance Admin / Platform Operations`; no formal capability defined in this volume is allowed to remain as CLI-only, environment-variable-only, or database-layer-only operations.

Formal pages and entry points on the web side include:

- Bootstrap / first administrator creation page
- Registration strategy and invitation strategy configuration page
- Instance-level user governance page
- Instance-level configuration page
- Health status and diagnostics page
- Background job / system status page
- Security and audit page
- Maintenance control entry points such as maintenance mode / read-only mode / task pause-resume

## Relationship To Existing Docs

- `docs/core/product-definition.md`
  - Defines the dependency relationships of OpenAPI / Figma / PRD, as well as `import`
- `docs/core/codebase-structure.md`
  - Defines where these capabilities belong in the code structure
- `docs/core/domain-model.md`
  - Defines instance-level capabilities, platform management capabilities, and the boundaries of code ownership

## Structure Decision

`instance-admin` is an independent top-level backend module (`apps/backend/internal/instance-admin/`).

Rationale:

- The scope is instance-level, not subordinate to any workspace / organization, and is completely different from governance (workspace-level business governance).
- The API contract source is `opentoggl-admin.openapi.json`, separated from the `toggl-*` public contracts consumed by governance.
- The 7 capability matrices defined by the PRD already have enough complexity to support an independent module.
- The table definitions of the bootstrap guard still belong to `platform/schema/` (the single pgschema path), while the business semantics belong to the domain of this module.
