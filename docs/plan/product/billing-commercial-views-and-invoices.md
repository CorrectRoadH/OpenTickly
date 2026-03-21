# Billing Commercial Views and Invoices

**Status:** Not started

**Goal:** Finish the billing surface after the foundational billing facts already exist.

## Why This Plan Exists

This plan exists because foundational billing facts alone are not enough; the commercial views, invoices, customer state, and quota-facing UI still need to be expressed as formal product behavior.

## Scope

- Invoice list and download
- Customer edit
- Plan, subscription, quota, and customer-facing management views
- Billing, subscription, plans, limits, invoices, and customer Web surfaces

## Authoritative Inputs

- PRD: [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)
- OpenAPI: use the billing-related public API definitions referenced by [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)
- Figma: use the billing/subscription references cited from [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)

## Development Constraints

- [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)
- [identity-and-tenant.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/identity-and-tenant.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md)
- [Reports and Sharing](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/reports-and-sharing.md)
- [Webhooks Runtime](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md)

## Current Drift Against Docs

- Billing UI/commercial behavior is not yet fully expressed according to [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)
- Downstream quota/gate behavior still depends on later surface completion and stronger verification against [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Acceptance Criteria

- Billing remains the single source of feature gate and quota facts
- Organization and workspace subscription views do not create competing truths
- Self-hosted may vary in billing backend but not in exposed object model or state expression
- Downgrade, over-limit, and historical-retention stories have explicit test mapping and coverage status
