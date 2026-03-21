# Tracking Core Transactions

**Status:** Not started

**Goal:** Establish tracking as the primary write-side business fact source for time entries and running timers.

## Why This Plan Exists

This plan exists because tracking facts are the core business source that later reports, webhooks, approvals, expenses, and import behavior all depend on. Without a stable tracking fact model, later product surfaces would each invent their own interpretation.

## Scope

- Time entry CRUD
- Running timer start/stop/conflict rules
- Bulk update
- Filter and since-sync behavior
- Timezone, RFC3339, and UTC semantics
- Timer list, calendar, timesheet, and create/edit flows

## Authoritative Inputs

- PRD: [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- OpenAPI: `openapi/toggl-track-api-v9.swagger.json`
- Figma: use the timer page-family references cited from [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)

## Development Constraints

- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)

## Current Drift Against Docs

- Tracking is not yet the single stable fact source required by [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md) and [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- Timer page-family semantics and external public API behavior are not yet proven against the full story/test expectations in [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Acceptance Criteria

- The same tracking facts drive list, calendar, and timesheet views
- Running-timer conflict rules are fixed and regression-protected
- Invalid `start/stop/duration` combinations return stable errors
- Since-sync and major filters align across the external public API and Web behavior
- Timer page-family flow and core E2E coverage exist
- Calendar, list, and timesheet views are explicitly tied to the same page-family semantics
