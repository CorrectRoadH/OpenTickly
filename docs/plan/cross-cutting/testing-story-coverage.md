# Testing Story Coverage

**Status:** In progress

**Goal:** Maintain story-linked verification across all plan collections.

## Why This Plan Exists

This plan exists because stories, tests, and completion claims drift easily unless coverage is maintained continuously. The repository rules require story-linked verification rather than endpoint-count or ad hoc test accumulation.

## Scope

- BDD story inventory
- Story-to-test-layer mapping
- Per-plan coverage status and deferrals
- Coverage expectations for page flow, E2E, contract, integration, runtime, and golden tests

## Development Constraints

- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [product-definition.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/product-definition.md)
- [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md)

## Required Test Layers

- `Domain Unit`
- `Application Integration`
- `Transport Contract`
- `Async Runtime`
- `Frontend Unit`
- `Frontend Feature`
- `Frontend Page Flow`
- `E2E`
- `Public Contract Golden`

## Rules

- Formal API behavior requires contract coverage
- Public contract output requires golden coverage
- Job/projector/delivery behavior requires runtime coverage
- Formal page families require page-flow coverage
- High-value paths require E2E coverage

## Ongoing Acceptance Criteria

- Each plan records covered stories, missing stories, and approved deferrals
- Page-flow and E2E gaps required by `docs/core/testing-strategy.md` remain visible until closed
- Story coverage is updated at the start and end of each major plan

## Stage 2 Active Plan Coverage Status

This table is the Stage 2 control-plane view. Story-level evidence detail remains in [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md).

| Active Stage 2 Plan | Covered Stories (current major evidence exists) | Missing Stories (required by plan scope but not complete) | Approved Deferrals / Gaps (explicit owner) |
| --- | --- | --- | --- |
| [Identity, Session, Tenant, and Billing Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/identity-session-tenant-and-billing-foundation.md) | `4`, `4A`, `5`, `5A`, `13`, `14` are partially-to-fully covered via backend integration + contract + shell/profile/settings page flow | `4B` is missing formal page-flow and E2E; `13A` remains missing; billing web surfaces for `13/14` remain missing | `4B` page-flow/E2E is deferred to [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md); billing commercial pages for `13/13A/14` are deferred to [Billing Commercial Views and Invoices](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/billing-commercial-views-and-invoices.md) |
| [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md) | `3A`, `7`, `7A`, `7B` have page-flow evidence on formal page families; `4B` has backend/contract partial coverage and plan ownership for closure | `4B` logout page-flow/E2E still missing; `3A/7/7A/7B` still missing E2E and contract depth for full close | tracking core timer stories `1/2/3` are deferred to [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md); membership lifecycle/contract depth is deferred to [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md) |
| [UI and Figma Parity Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/ui-and-figma-parity-baseline.md) | shared shell and identity pages already have PRD/Figma/page-flow links for `4`, `4A`, `5` | direct `profile` and `settings` E2E and screenshot closure still missing | non-shell page families (projects/clients/tasks/tags/members/groups/permission-config) remain intentionally deferred to [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md) and [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md) |
| [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md) | `6` has backend domain + application + transport-contract + page-flow evidence for invite/join/disable/restore/remove across the implemented workspace-members plus invite-status/joined surfaces; `3A` has partial contract plus page-flow evidence on `projects`/`clients`/`tags`; `7` has domain/page evidence for private-project visibility and archived tracking access rules; `7A` has `groups` page-flow evidence; `7B` has permission-config page-flow evidence | `6` still lacks explicit E2E; `6A` member rate/cost settings remain missing; `3A` still lacks task page-flow plus deeper CRUD/archive/template/stats/periods evidence; `7` still lacks reports/webhooks/runtime visibility evidence; `7A` lacks backend contract/integration depth for group membership semantics; `7B` lacks backend contract/integration depth and E2E | downstream access effects across reports/webhooks and member rate-cost behavior remain owned by this plan and stay open until implemented; no completion claim is approved yet |

## Stage 2 Story -> Required Layer Snapshot

Legend: `Y` covered, `P` partial, `N` missing, `D` deferred with an approved owner.

| Story | Plan Owner | Domain Unit | App Integration | Transport Contract | Async Runtime | Frontend Unit | Frontend Feature | Frontend Page Flow | E2E | Golden | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `4` Login and workspace context | foundation identity/billing | Y | Y | Y | N | N | P | Y | Y | N | covered |
| `4A` Profile/preferences/token | foundation identity/billing | Y | Y | Y | N | N | P | Y | P | N | partial |
| `4B` Logout and session closure | foundation one-way | N | Y | Y | N | N | N | N | N | N | gap |
| `5A` Organization/workspace context | foundation identity/billing | P | Y | Y | N | N | P | Y | P | N | partial |
| `5` Workspace settings | foundation identity/billing | P | Y | Y | N | N | P | Y | P | N | partial |
| `13` Plan/subscription/quota | foundation identity/billing | Y | Y | P | N | N | N | N | N | N | partial |
| `13A` Customer/invoice/payment status | product billing | N | N | N | N | N | N | N | N | N | deferred |
| `14` Downgrade and over-limit handling | foundation identity/billing | Y | Y | N | N | N | N | N | N | N | partial |
| `3A` Catalog objects projects/clients/tasks/tags | foundation one-way + product membership | P | P | P | N | N | P | Y | N | N | partial |
| `6` Member lifecycle invite/join/disable/restore/remove | product membership | Y | Y | Y | N | P | P | Y | N | N | partial |
| `6A` Member rate/cost settings | product membership | N | N | N | N | N | N | N | N | N | gap |
| `7` Access effects on visibility and mutability | foundation one-way + product membership | P | P | N | N | N | P | P | N | N | partial |
| `7A` Groups and group membership | foundation one-way + product membership | N | N | N | N | N | P | Y | N | N | partial |
| `7B` Permission policy configuration | foundation one-way + product membership | N | N | N | N | N | P | Y | N | N | partial |
| `15`-`18` Instance admin stories | product instance-admin | N | N | N | N | N | N | N | N | N | deferred |

## Stage 2 Membership / Catalog Evidence Notes

- Story `6` currently has explicit evidence on the implemented workspace-members plus invite-status/joined slice: domain lifecycle tests in `apps/backend/internal/membership/domain/workspace_member_test.go`, application integration tests in `apps/backend/internal/membership/application/service_test.go`, generated transport-contract route tests in `apps/backend/internal/http/web_workspace_members_generated_test.go`, Web page-flow coverage in `apps/website/src/pages/members/__tests__/workspace-members-page-flow.test.tsx` and `apps/website/src/pages/members/__tests__/invite-status-joined-page-flow.test.tsx`, and joined-page URL-state unit coverage in `apps/website/src/shared/url-state/__tests__/invite-status-location.test.ts`.
- Story `3A` currently has formal Web page-flow evidence for `projects`, `clients`, and `tags`, plus partial transport-contract coverage for generated project/client/tag routes. This is still partial because `tasks`, deeper CRUD surface, and stats/templates/periods behavior are not yet covered as required by the product plan.
- Story `7` currently has partial evidence from `apps/backend/internal/catalog/domain/project_access_test.go` plus the existing `projects` page flow. This only covers part of the documented private-project visibility/mutability rules and does not yet close reports/webhooks/runtime propagation.
- Story `7A` currently has page-flow evidence on the `groups` page only; backend contract and group-membership semantics remain open.
- Story `7B` currently has page-flow evidence on the permission-configuration page only; backend contract/integration depth and E2E remain open.
- Story `6A` remains unimplemented in the current formal surface, so no coverage is claimed.

## Stage 2 Page-Flow / E2E Gap Register

- `timer` page family (`calendar | list | timesheet`) still lacks required page-flow and E2E closure; owner: [Tracking Core Transactions](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md).
- `integrations webhooks` page family still lacks formal page-flow and E2E coverage; owner: [Webhooks Runtime](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md).
- `profile` and `settings` still lack direct E2E per-page closure; owner: [UI and Figma Parity Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/ui-and-figma-parity-baseline.md).
- `projects`/`clients`/`tags`/`groups`/`permissions` page families have current page-flow evidence but still miss direct E2E closure and, where applicable, matching backend contract depth; owner: [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md).
- `workspace members` and `invite-status/joined` have current page-flow coverage for the implemented member lifecycle closure but still miss direct E2E; owner: [Membership, Access, and Catalog](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/membership-access-and-catalog.md).
- `auth logout` and protected-route guard path still lacks formal page-flow and E2E closure; owner: [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md).

## Current Drift Against Docs

- Several active plan collections still summarize evidence without a full story-to-test-layer mapping required by [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- The story inventory in [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md) still contains partially covered flows that should gate completion more explicitly
