# Reports and Sharing

**Status:** Not started

**Goal:** Build a distinct reports product surface on top of tracking facts without redefining their semantics.

## Why This Plan Exists

This plan exists because reports are a separate product surface with their own read semantics, exports, sharing, and saved objects. They must not collapse into ad hoc queries over OLTP facts.

## Scope

- Detailed, summary, weekly, trends, profitability, and insights reports
- Saved reports, shared reports, filters, pagination, sorting, and exports
- Report projections and export flow
- Web save/share/export flows

## Authoritative Inputs

- PRD: [reports-and-sharing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/reports-and-sharing.md)
- OpenAPI: `openapi/toggl-reports-v3.swagger.json`
- Figma: use the report page references cited from [reports-and-sharing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/reports-and-sharing.md)

## Development Constraints

- [reports-and-sharing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/reports-and-sharing.md)
- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)
- [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md)
- [Tracking Extensions and Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-extensions-and-governance.md)

## Current Drift Against Docs

- Reports product behavior, saved/shared object behavior, and export alignment are not yet implemented as required by [reports-and-sharing.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/reports-and-sharing.md)
- The read-model and verification expectations described in [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md) and [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md) are still outstanding

## Acceptance Criteria

- Online queries, exports, saved reports, and shared reports all use the same permission and filter semantics
- Report interpretation stays aligned with tracking history
- Exchange-rate, rounding, and profitability rules stay consistent across shared, exported, and online views
- Report page-flow, export golden coverage, and at least one high-value E2E path exist
