# Runtime and Delivery Readiness Gate

**Status:** In progress

**Goal:** Prove that the backend, readiness model, migration/init flow, and self-hosted packaging are formally workable before further product-surface expansion.

## Why This Plan Exists

This plan exists because “the process starts” is still not the same thing as “the backend is formally workable.” The docs require real env, real dependencies, schema management, readiness, and self-hosted delivery evidence before later product expansion is allowed.

## Scope

- Backend env and startup correctness
- Runtime observability
- Real readiness checks
- `pgschema`-based schema plan/apply workflow
- Minimal smoke verification
- Single-image release-path verification
- Upgrade/rollback and persistence/env documentation

## Development Constraints

- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [codebase-structure.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/codebase-structure.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)
- [instance-admin.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/instance-admin.md)

## Depends On

- [Monorepo and Generation Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/monorepo-and-generation-foundation.md)
- [Local Development Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/local-development-baseline.md)
- [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md) for boundary cleanup areas that affect runtime truth

## Blocks

- Formal progression of [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md) and every downstream product plan

## Workstreams

- `backend-env-and-startup`
- `backend-runtime-observability`
- `contract-boundary-repair`

## Current Drift Against Docs

- Source startup still does not fully prove the real-env, real-datasource path required by [codebase-structure.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/codebase-structure.md)
- Readiness and startup evidence are still thinner than the runtime proof required by [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md) and [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- Self-hosted release evidence still needs to fully match the delivery expectations in [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)

## Testing Story Coverage Status (Stage 2)

Coverage source of truth:

- [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md)
- [testing-story-coverage.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/testing-story-coverage.md)

Covered stories (this plan's runtime prerequisites currently supporting downstream stories):

- runtime/readiness evidence needed before `15-18` instance-admin stories can be formally validated

Missing stories in this plan scope:

- no instance-admin product story (`15`, `16`, `17`, `18`) is fully closed within this foundation gate

Approved deferrals/gaps:

- full story closure for `15-18` is owned by [Instance Admin and Platform Operations](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/instance-admin-and-platform-operations.md)
- webhook/report/import runtime product chains are owned by downstream product plans after readiness gate completion

Page-flow / E2E gaps to keep visible:

- no formal instance-admin page-flow/E2E chain is present yet for bootstrap, registration policy, governance, config, health, maintenance, or audit surfaces
- these gaps remain blocking for instance-admin completion but are intentionally outside this plan's direct implementation scope

## Acceptance Criteria

- Backend source startup requires real env and real datasource configuration
- Startup, dependency failure, readiness failure, and request handling have useful default diagnostics
- `/readyz` checks real dependency and config state rather than acting as a static health echo
- `pgschema` is the only formal schema-management path and can initialize a new environment
- Minimal smoke verification distinguishes process start from dependency readiness
- Single-image build and startup verification works end to end
- Documentation covers upgrade, rollback, volumes, and required env

## Evidence Required

- Reproducible startup logs and readiness checks
- `pgschema` plan/apply evidence
- Containerized smoke evidence
- Single-image build/run verification
