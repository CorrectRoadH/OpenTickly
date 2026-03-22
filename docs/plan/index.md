# OpenToggl Plan Index

> Active planning entrypoint.
>
> Historical snapshot: `docs/plan/2026-03-20-opentoggl-full-implementation-plan.md`

## Rules

- This file is the execution queue.
- Order is defined by blocking relationships, not by document category.
- Items inside the same stage are intended to be parallelizable when write sets do not overlap.
- Later stages are blocked on the completion criteria of earlier stages unless a linked plan explicitly says otherwise.
- Completed items stay listed here; they are part of the audit trail.

## Stage 0: Active Meta Baseline

- [x] [Execution Model and Review Gates](/Users/opentoggl-ci/Code/opentoggl/docs/plan/meta/execution-model-and-review-gates.md)
- [x] [Risk Controls and Global Dependencies](/Users/opentoggl-ci/Code/opentoggl/docs/plan/meta/risk-controls-and-global-dependencies.md)

## Stage 1: Foundation Already Landed

- [x] [Monorepo and Generation Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/monorepo-and-generation-foundation.md)
- [x] [Local Development Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/local-development-baseline.md)

## Stage 2: Current Blocking Work

- [x] [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md)
- [x] [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- [x] [UI and Figma Parity Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/ui-and-figma-parity-baseline.md)
- [x] [Runtime and Delivery Readiness Gate](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/runtime-and-delivery-readiness-gate.md)
- [x] [Testing Story Coverage](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/testing-story-coverage.md)
- [x] [Self-Hosted and Release Artifacts](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/self-hosted-and-release-artifacts.md)

### Stage 2 Parallel Streams

`stream: structure-governance`

- plan: [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md)
- write set: `apps/backend/internal/http/*`, `apps/backend/internal/bootstrap/*`, `apps/website/src/pages/*`, `apps/website/src/routes/*`, `packages/shared-contracts/*`, `packages/utils/*`, affected docs
- blockers: none beyond Stage 1
- unlocks: formal route/session/url-state convergence and removal of naming/path drift

`stream: identity-foundation-finish`

- plan: [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- write set: `apps/backend/internal/{identity,tenant,billing}/*`, `apps/website/src/pages/{auth,profile,settings,shell}/*`, related contracts and tests
- blockers: must not conflict with `structure-governance` on shared runtime files
- unlocks: stable auth/session/tenant/billing facts for downstream product surfaces

`stream: ui-parity-baseline`

- plan: [UI and Figma Parity Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/ui-and-figma-parity-baseline.md)
- write set: `apps/website/src/pages/{shell,profile,settings}/*`, `packages/web-ui/*`, screenshot/evidence assets, related tests
- blockers: depends functionally on identity foundation, but can run in parallel when write ownership is explicit
- unlocks: shared UI baseline for later page families

`stream: runtime-readiness`

- plan: [Runtime and Delivery Readiness Gate](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/runtime-and-delivery-readiness-gate.md)
- write set: `apps/backend/internal/bootstrap/*`, `apps/backend/internal/http/*`, root env/docs, self-hosted verification assets
- blockers: coordinate with `structure-governance` on shared backend runtime files
- unlocks: Stage 3 and every downstream formal product plan

`stream: story-coverage`

- plan: [Testing Story Coverage](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/testing-story-coverage.md)
- write set: `docs/testing/bdd-user-stories.md`, linked plan docs, test coverage matrices
- blockers: none; should track the active stream set continuously
- unlocks: explicit acceptance visibility for every active collection

`stream: self-hosted-artifacts`

- plan: [Self-Hosted and Release Artifacts](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/self-hosted-and-release-artifacts.md)
- write set: self-hosted docs, compose/runtime artifact docs, smoke instructions, release asset expectations
- blockers: coordinate with `runtime-readiness` on shared startup/smoke definitions
- unlocks: release-path confidence and early packaging convergence

## Stage 3: First Formal Product Expansion

- [ ] [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)

## Stage 4: Tracking Fact Source

- [ ] [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md)

## Stage 5: Parallel Expansion On Tracking Facts

- [ ] [Tracking Extensions and Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-extensions-and-governance.md)
- [ ] [Reports and Sharing](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/reports-and-sharing.md)
- [ ] [Webhooks Runtime](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md)

### Stage 5 Parallel Streams

`stream: tracking-extensions`

- plan: [Tracking Extensions and Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-extensions-and-governance.md)
- write set: `tracking` and `governance` modules, approvals/expenses UI, related tests
- blockers: Stage 4 tracking facts must be stable
- unlocks: richer tracking-state semantics for later reporting and operations

`stream: reports`

- plan: [Reports and Sharing](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/reports-and-sharing.md)
- write set: `reports` module, report UI/pages, exports, related tests
- blockers: Stage 4 tracking facts plus required Stage 5 governance semantics where needed
- unlocks: formal reporting surface and shared/export behavior

`stream: webhooks`

- plan: [Webhooks Runtime](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md)
- write set: `webhooks` module, integrations/webhooks UI, delivery runtime tests
- blockers: Stage 4 tracking facts and membership/access visibility rules
- unlocks: formal event runtime and downstream operations visibility

## Stage 6: Late Product Surfaces

- [ ] [Billing Commercial Views and Invoices](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/billing-commercial-views-and-invoices.md)
- [ ] [Import Migration Closure](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/import-migration-closure.md)
- [ ] [Instance Admin and Platform Operations](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/instance-admin-and-platform-operations.md)

## Stage 7: Final Closure

- [ ] [Public Contract and Release Readiness](/Users/opentoggl-ci/Code/opentoggl/docs/plan/release/public-contract-and-release-readiness.md)

## Parallelism Notes

- Stage 2 is intentionally the main parallel work stage, but only for non-overlapping write sets.
- `Testing Story Coverage` and `Self-Hosted and Release Artifacts` are cross-cutting and should be updated alongside the active stage rather than deferred.
- Stage 5 is the next major parallel stage after tracking core facts are stable.
