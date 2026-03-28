# Instance Admin and Platform Operations

**Status:** In progress

**Backend module:** `apps/backend/internal/instance-admin/` (independent top-level module)

**Goal:** Provide the formal host-product surface required to run and govern an OpenToggl instance.

## Why This Plan Exists

This plan exists because OpenToggl is not only a set of business features; it also has to run as a governable, diagnosable, maintainable instance. Those host-product surfaces must be explicit rather than hidden in scripts or ops-only procedures.

## Scope

- Bootstrap, registration policy, instance user governance, config entry points
- Ops, health, diagnostics, security, audit, maintenance, read-only mode, job pause/resume
- `opentoggl-admin` contract
- Bootstrap, policy, governance, config, health, and maintenance UI

## Authoritative Inputs

- PRD: [instance-admin.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/instance-admin.md)
- OpenAPI: `openapi/opentoggl-admin.openapi.json`
- Figma: use the instance-admin references cited from [instance-admin.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/instance-admin.md)

## Development Constraints

- [instance-admin.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/instance-admin.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)

## Depends On

- [Monorepo and Generation Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/monorepo-and-generation-foundation.md)
- [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- [Reports and Sharing](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/reports-and-sharing.md)
- [Webhooks Runtime](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md)
- [Import Migration Closure](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/import-migration-closure.md)

## Current Drift Against Docs

- Instance-level bootstrap, governance, and diagnostics surfaces are not yet formalized as required by [instance-admin.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/instance-admin.md)
- Self-hosted init and ops flows still need to align with the readiness and delivery expectations described in [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)

## Acceptance Criteria

- First-admin bootstrap is successful exactly once
- Registration policy, instance governance, health, and maintenance surfaces are formal product behavior
- Admin is not a silent business-object superuser shortcut
- High-privilege operations are audited
- First-admin init and instance-health surfaces work in containerized smoke verification
