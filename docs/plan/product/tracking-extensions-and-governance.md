# Tracking Extensions and Governance

**Status:** Not started

**Goal:** Extend tracking with approvals, expenses, and governance-linked rules without redefining the tracking fact model.

## Why This Plan Exists

This plan exists because approvals, expenses, and related governance rules are formal product behavior layered on top of tracking facts, not side features that can invent separate lifecycle rules.

## Scope

- Approval state machine and authority rules
- Expenses state machine, attachments, and currency snapshot rules
- Favorites, goals, reminders, and timeline
- Approvals pages, expenses pages, and related tracking-extension entry points

## Authoritative Inputs

- PRD: [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- OpenAPI: `openapi/toggl-track-api-v9.swagger.json`
- Figma: use the approvals/expenses/tracking references cited from [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)

## Development Constraints

- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md)

## Current Drift Against Docs

- Approval and expense lifecycle behavior is not yet fully realized relative to [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- Governance-linked runtime and story coverage remain incomplete relative to [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Acceptance Criteria

- Approval and expense state machines are fixed and consistently enforced
- Approval authority and reopen-on-edit rules align across API and Web
- Attachment, exchange-rate snapshot, and historical freeze semantics are complete
- Story coverage status is updated with explicit remaining gaps
