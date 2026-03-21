# Public Contract and Release Readiness

**Status:** Not started

**Goal:** Close the implementation across product surfaces without introducing a new source of truth.

## Why This Plan Exists

This plan exists because the final delivery problem is cross-surface closure, not one more feature slice. It is where public contract verification, release artifacts, and integrated runtime proof come together.

## Scope

- Cross-surface behavior closure
- Validation against the referenced public definitions for Track API v9, Reports API v3, and Webhooks API v1
- Final release artifact and smoke-readiness checks

## Development Constraints

- [product-definition.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/product-definition.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)

## Depends On

- [Billing Commercial Views and Invoices](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/billing-commercial-views-and-invoices.md)
- [Import Migration Closure](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/import-migration-closure.md)
- [Instance Admin and Platform Operations](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/instance-admin-and-platform-operations.md)
- [Testing Story Coverage](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/testing-story-coverage.md)
- [Self-Hosted and Release Artifacts](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/self-hosted-and-release-artifacts.md)

## Current Drift Against Docs

- Cross-surface closure has not yet been proven against the combined expectations in [product-definition.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/product-definition.md) and [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- Release-path proof still depends on upstream completion of self-hosted artifacts and final integrated verification

## Acceptance Criteria

- All formal product surfaces have both API and Web expressions where required
- Public contract outputs are validated by contract, golden, and story-linked evidence
- Import and instance-admin are formal product surfaces, not manual script paths
- Figma, docs, OpenAPI, implementation, and tests remain aligned
- New environments can migrate, initialize, pass health/readiness, log in, enter a workspace, and complete minimal smoke paths
