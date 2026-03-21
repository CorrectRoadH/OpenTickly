# Import Migration Closure

**Status:** Not started

**Goal:** Turn importing into a formal product capability rather than a one-off script path.

## Why This Plan Exists

This plan exists because importing is a first-class OpenToggl product surface, not a one-time migration script. It has to preserve references, diagnostics, retry behavior, and readback through the formal product surfaces.

## Scope

- Import jobs, ID mapping, entity import phases, time-entry import
- Conflict, failure, retry, diagnostics, and result API
- `opentoggl-import` contract
- Import pages, job list, diagnostics, and retry entry points

## Authoritative Inputs

- PRD: [importing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/importing.md)
- OpenAPI: `openapi/opentoggl-import.openapi.json`
- Figma: use the import page references cited from [importing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/importing.md)

## Development Constraints

- [importing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/importing.md)
- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)
- [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md)
- [Tracking Extensions and Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-extensions-and-governance.md)
- [Reports and Sharing](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/reports-and-sharing.md)

## Current Drift Against Docs

- Import still lacks the formal runtime, diagnostics, and retry closure required by [importing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/importing.md)
- Formal readback and verification through the rest of the product surface are still incomplete relative to [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Acceptance Criteria

- A minimal Toggl sample imports successfully and is readable in primary tracking views and the external public API
- ID mapping, failure detail, conflict diagnostics, and retry behavior are complete
- Import continuation uses the real job runtime
- Import page family, diagnostics, and minimal-sample success E2E exist
