# One-Way Structure Governance

**Status:** In progress

**Goal:** Close structural drift before further product expansion by enforcing one-way architecture, canonical entrypoints, and removal of placeholder or duplicate internal paths.

## Why This Plan Exists

This plan exists because the current repository still contains structural drift that directly conflicts with the documented architecture and development rules. Without closing that drift first, later feature work would continue to expand on top of duplicate paths, placeholder runtime behavior, and long-lived temporary naming.

## Scope

- Canonical root-level developer entrypoints and env loading
- Generated Web contract boundary instead of hand-maintained transport drift
- Removal of internal aliases, duplicate adapters, and placeholder runtime defaults
- Frontend parity recovery for formal page families still carrying transition-state UI
- Route-level auth/session behavior and URL-state normalization
- Resolution of source/test conflicts in shared contracts
- Decision on whether `packages/utils` remains a real workspace package

## Development Constraints

- [codebase-structure.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/codebase-structure.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)

## Depends On

- [Monorepo and Generation Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/monorepo-and-generation-foundation.md)
- [Local Development Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/local-development-baseline.md)

## Blocks

- New related feature, route, script, helper, alias, placeholder-runtime, or second-path work in affected areas
- Formal completion claims for several existing Web pages and current runtime areas

## Current Focus

- Require root `.env.local` and explicit datasource configuration for source-based backend startup
- Replace remaining hand-maintained Web transport and route registration drift with generated boundary behavior
- Remove low-signal bootstrap/config unit tests where runtime startup evidence is the stronger proof
- Recover formal page families still presenting `Transition state` UI
- Move protected-page behavior to route-level guards and finish logout/session closure
- Remove phase-based and `compat`-based naming from long-lived implementation assets so execution terminology and fuzzy migration labels no longer leak into runtime, transport, generation, or test boundaries

## Current Drift Against Docs

- `apps/backend/internal/http/*` still carries transport/runtime responsibilities that [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md) says must be generated or delegated to module transport boundaries
- Several formal page families still behave like transition-state pages even though [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md) requires formal page/feature/entity boundaries
- Auth/session routing still has component-level fallback behavior where [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md) expects route-level guard behavior
- Naming and boundary drift still conflict with the canonical-name and long-lived naming rules in [codebase-structure.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/codebase-structure.md)

## Naming Cleanup Packet

- Replace long-lived `compat` naming with precise responsibility names such as `public-api`, product-surface names, or explicit contract-boundary names
- Start with documentation and plan terminology, then follow with implementation paths, generation scripts, and test asset names
- Treat current names such as `transport/http/compat`, `apps/backend/tests/compat`, and similar catch-all labels as historical debt rather than accepted target naming

## Acceptance Criteria

- Backend source startup fails immediately when `.env.local` or required datasource env is missing
- Formal Web routes are registered via generated boundary behavior instead of continued hand-maintained route tables
- Page families in `projects`, `clients`, `tasks`, `tags`, `groups`, and `permission-config` no longer rely on transition-state messaging as their completion story
- Search params enter pages only through route validation/schema paths, not page-level ad hoc parsing
- Formal logout flow exists and clears session/query state before redirecting to `/login`
- Protected pages use route-level auth/session guard behavior rather than component-level fallback branching
- Contract source and contract tests no longer disagree about placeholder semantics
- `packages/utils` is either removed or given a real, documented responsibility
- Long-lived implementation assets no longer use phase-based names such as `wave1_*`, `wave2_*`, `phase_*`, or equivalent aliases
- Long-lived implementation assets no longer use `compat` as a catch-all boundary name when a more precise responsibility name exists

## Evidence Required

- Runtime startup and readiness evidence
- Updated OpenAPI/generated contract evidence where transport boundaries changed
- Page-flow and E2E evidence for auth/session and protected-route behavior
- Linkable references to resolved drift items
- A tracked rename/removal plan for existing phase-based and `compat`-based implementation names, even if the code cleanup lands incrementally
