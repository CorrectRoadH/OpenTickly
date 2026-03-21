# Webhooks Runtime

**Status:** Not started

**Goal:** Implement formal Webhooks runtime behavior rather than stopping at subscription CRUD.

## Why This Plan Exists

This plan exists because Webhooks are a runtime product surface with delivery, retry, validation, limits, and visibility rules. Treating them as CRUD-only would violate both the PRD and runtime architecture.

## Scope

- Subscription CRUD, filters, validate/ping, signatures, delivery records, retry, disable, limits, and status
- Event exposure changes caused by ownership, workspace visibility, and private-object access
- Integrations/Webhooks UI for subscriptions and delivery history

## Authoritative Inputs

- PRD: [Webhooks.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/Webhooks.md)
- OpenAPI: `openapi/toggl-webhooks-v1.swagger.json`
- Figma: use the `Integrations / Webhooks` reference cited from [Webhooks.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/Webhooks.md)

## Development Constraints

- [Webhooks.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/Webhooks.md)
- [membership-and-access.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/membership-and-access.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)
- [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md)
- [Tracking Extensions and Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-extensions-and-governance.md)

## Current Drift Against Docs

- Webhook delivery/runtime behavior is not yet fully implemented according to [Webhooks.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/Webhooks.md)
- Permission-sensitive event exposure and runtime verification remain incomplete relative to [membership-and-access.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/membership-and-access.md) and [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Acceptance Criteria

- Validate/ping and real delivery share the same runtime but expose distinct statuses
- Retry, disable, limits, and status are formal runtime behavior
- Permission and visibility changes affect downstream event exposure correctly
- Webhooks page family, runtime tests, and baseline validation E2E coverage exist
