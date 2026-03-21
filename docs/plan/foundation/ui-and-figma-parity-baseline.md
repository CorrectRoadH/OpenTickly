# UI and Figma Parity Baseline

**Status:** In progress

**Goal:** Finish the parity polish and evidence chain for the shared shell and foundational account/settings surfaces before broader page-family expansion.

## Why This Plan Exists

This plan exists because shell/profile/settings already have formal product meaning, but the current UI baseline and evidence chain are still incomplete. Later page-family work should not expand on top of partially aligned shell and settings foundations.

## Scope

- Shared shell parity recovery
- `profile` parity recovery
- `settings` parity recovery
- Promotion of `packages/web-ui` from minimal baseline to reusable app-level UI baseline
- Formal evidence chain from PRD to Figma to implementation to test to screenshot

## Development Constraints

- [identity-and-tenant.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/identity-and-tenant.md)
- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)

## Current Status

- Formal shell/profile/settings skeletons landed
- Page-flow and some runtime evidence landed
- Screenshot evidence and some direct E2E evidence remain incomplete
- Later page-family source mapping was prepared, but several formal pages still need parity recovery

## Current Drift Against Docs

- Shared shell/profile/settings still lack full PRD -> Figma -> implementation -> test -> screenshot closure required by [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- Shared UI baseline reuse is still thinner than the application-level UI baseline expected by [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)

## Acceptance Criteria

- Shell, profile, and settings no longer contain development-stage hero, placeholder, or transition-story UI
- Shared loading, error, empty, and success-state patterns are reusable across upcoming page families
- Shell/profile/settings each have a traceable PRD -> Figma -> implementation -> test -> screenshot chain
- Future page-family work has explicit Figma or fallback source references before expansion

## Evidence Required

- Page-flow evidence
- Direct or real-runtime E2E where applicable
- Screenshot evidence
- Figma reference linkage
