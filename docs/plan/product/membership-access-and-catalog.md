# Membership, Access, and Catalog

**Status:** In progress

**Goal:** Establish the permission model, member lifecycle, and directory objects needed by tracking, reports, and webhooks, with formal API and Web behavior.

## Why This Plan Exists

This plan exists because tracking, reports, and webhooks all depend on membership, access control, and catalog objects being formalized first. The current implementation has an initial slice, but the product surface and supporting contracts are still incomplete relative to the PRD and architecture rules.

## Scope

- Membership roles, invite/join/disable/restore/remove lifecycle
- Organization/workspace/project/group relationships
- Rate and cost fields
- Clients, projects, tasks, tags, archive/restore, pin/unpin, templates, stats, and periods
- Members, groups, project members, rate/cost settings, and permission configuration pages

## Authoritative Inputs

- PRD: [membership-and-access.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/membership-and-access.md)
- PRD: [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- OpenAPI: `openapi/toggl-track-api-v9.swagger.json`
- OpenAPI: `openapi/opentoggl-web.openapi.json`
- Figma: use the project/client/tag/tracking page references cited from [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)

## Development Constraints

- [membership-and-access.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/membership-and-access.md)
- [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md)
- [UI and Figma Parity Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/ui-and-figma-parity-baseline.md)
- [Runtime and Delivery Readiness Gate](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/runtime-and-delivery-readiness-gate.md)

## Current Status

- First contracts, backend-core, Web-pages, and runtime-endpoints slice exists
- Formal completion is blocked by readiness work and remaining project-page/product-surface gaps
- Workspace members and invite-status joined surfaces now cover the implemented invite/join/disable/restore/remove lifecycle closure on the existing formal Web surface, with focused backend and page-flow coverage
- Project, client, tag, group, and permission-configuration pages all have formal page-flow coverage on the current Web surface, but they remain partial relative to full PRD exit rules because E2E, broader contract depth, and several downstream effects are still open

## Known Gaps

- `project` still lacks the full formal page and contract surface required by the original exit rule
- Transition-state UI and incomplete contract coverage remain for several page families
- Pin/unpin, templates, stats, and periods are not yet represented as complete formal behavior

## Current Drift Against Docs

- Project/client/task/tag surfaces still fall short of the behavior promised by [tracking.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/tracking.md)
- Membership and permission pages are not yet fully aligned with the formal behavior required by [membership-and-access.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/membership-and-access.md)
- Some formal pages still rely on transition-state behavior that conflicts with [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)

## Acceptance Criteria

- Permissions are enforced by data and contracts, not only by hidden UI
- Private-project visibility and mutability are consistent across API, Web, and downstream entry points
- Rate and cost values are usable by tracking and reports
- Project/client/task/tag surfaces cover CRUD plus archive/restore, pin/unpin, templates, and stats/periods
- Rate/cost settings and permission configuration are formal pages with test coverage
- Story coverage is updated in the cross-cutting testing plan

## Evidence Required

- Contract and integration coverage for membership and catalog behavior
- Page-flow and E2E coverage for formal page families
- PRD/Figma or explicit fallback references for formal Web pages

## Recent Progress

- Workspace member lifecycle actions now exist on the existing members page for disable, restore, and remove flows alongside invite
- Invite-status joined closure now exists as a formal public page with canonical search parsing and page-flow coverage back into login and the workspace shell
- Focused verification for the workspace-member lifecycle slice passed:
  - `go test ./apps/backend/internal/http ./apps/backend/internal/membership/application`
  - `vp run website#test:unit -- --run src/pages/members/__tests__/workspace-members-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/pages/members/__tests__/invite-status-joined-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/shared/url-state/__tests__/invite-status-location.test.ts`
- Existing catalog/access page-flow slices already provide formal Web evidence for currently implemented page families:
  - `vp run website#test:unit -- --run src/pages/projects/__tests__/projects-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/pages/clients/__tests__/clients-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/pages/tags/__tests__/tags-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/pages/groups/__tests__/groups-page-flow.test.tsx`
  - `vp run website#test:unit -- --run src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx`
- Existing backend/domain and generated-route tests also provide partial non-page evidence for implemented slices:
  - `go test ./apps/backend/internal/catalog/domain ./apps/backend/internal/http`
