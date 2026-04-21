# OpenToggl Full Implementation Plan

> Historical snapshot retained for reference.
>
> Active planning entrypoint: [`docs/plan/index.md`](/Users/opentoggl-ci/Code/opentoggl/docs/plan/index.md)
>
> This document remains as the original consolidated snapshot from 2026-03-20/2026-03-21. New plan navigation, dependency ordering, and per-collection status now live in the split plan documents under `docs/plan/`.

> **Hard Constraints**
>
> 1. Development execution for this plan must be performed by subagents. The main agent is only responsible for orchestration, dependency management, review gates, aggregated acceptance, and merge decisions.
> 2. Behavior-changing implementation tasks must follow TDD: write the failing test first, then the minimum implementation, then refactoring and regression protection. However, infra/config/bootstrap/runtime wiring, plan/doc updates, mechanical renames, generated artifact refresh, and structural-governance items that do not intentionally change behavior follow the non-TDD verification in `AGENTS.md`, and must not add low-signal tests just for ceremony.
> 3. No formal product capability may land "API-only first" or "Web-only first"; the wave that owns the capability must complete the corresponding API, Web, and test chains together.
> 4. self-hosted is not an add-on script after release; from Wave 0 onward it must be pushed as a formal delivery target, and must end up with buildable, startable, and verifiable containerized artifacts.

**Goal:** Build OpenToggl v1 on the current starter repository, per the documented definitions, compatible with Toggl's current public product surface. Coverage includes Track API v9, Reports API v3, Webhooks API v1, the corresponding Web UI, and OpenToggl's own `import` and `instance-admin` product surfaces.

**Architecture:** Monolith-first architecture, one Go `apps/backend` process plus one React `apps/website` application. The backend splits along `transport -> application -> domain` and fixed bounded contexts; the frontend splits along `app/routes/pages/features/entities/shared`. The transactional write model uses PostgreSQL as the source of truth; reports and async delivery are handled via an in-process job runner and projection read models.

**Tech Stack:** Go + Echo + oapi-codegen + pgx + PostgreSQL + `pgschema` + Redis; React + Vite+ + Tailwind CSS 4 + TanStack Router + TanStack Query + react-hook-form + zod + baseui + styletron.

---

## 0. Execution Todo

> Notes:
>
> - `- [x]` means it has passed the corresponding wave gate and can be considered the completed portion of this plan.
> - `- [ ]` means incomplete, including both "not started" and "in progress"; in-progress items are labeled in the entry text.
> - Checkbox state here is for execution tracking and does not replace the formal `Exit Criteria` and global test requirements in each wave below.

> Before starting any incomplete TODO, you must first read the following documentation entries by category:
>
> - Wave-level product implementation TODO: first read the corresponding `docs/product/*.md`, then `docs/core/architecture-overview.md`, `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`, `docs/core/frontend-architecture.md`, `docs/core/testing-strategy.md`, and finally drill down into the corresponding `openapi/*.json` and Figma.
> - Test plan and story list TODO: first read `docs/core/testing-strategy.md`, `docs/testing/bdd-user-stories.md`, then revisit the corresponding product PRD / OpenAPI / Figma.
> - Self-hosted and release delivery chain TODO: first read `docs/core/architecture-overview.md`, `docs/core/codebase-structure.md`, `docs/self-hosting/docker-compose.md`, `docs/product/instance-admin.md`, then read the product docs and OpenAPI of the affected waves.
> - When a TODO actually begins execution, you must continue to write `PRD`, `Core Docs`, `OpenAPI Source`, `Figma Reference` explicitly in the corresponding task packet; you cannot cite only this overall entry.
>
> Execution priority notes:
>
> - Structural closure, tech-debt governance, and startup/delivery chain fixes take priority over continued feature-surface expansion.
> - If the foundational structure is still drifting, you are not allowed to skip structural governance with "do the feature first, tidy up later."
> - Cleanup of placeholder pages, placeholder runtime, hand-written transport shells, and Figma-alignment gaps is a high-priority blocker before Wave 2, and must not be deprioritized as something that "will naturally be solved during implementation."
> - Newly discovered duplicate path / duplicate naming / duplicate implementation / internal compat alias problems are queue-jumping structural-governance items; once discovered they are immediately moved to the head of the current execution queue, and expansion of related feature surfaces pauses until closed.
> - `air` only proves that the backend dev runtime can hot-reload and start; this is not equivalent to "the backend is working." Until database migration, initialization, real readiness, dependency connectivity, and minimal smoke verification are fixed, treat this as a pre-Wave-2 blocker.
> - The root `.env.local` is a required prerequisite for source-based local development; `.env.example` is only a template. Missing `.env.local`, missing datasource env, or default startup continuing to fall back to in-memory/placeholder runtime all count as unclosed structure.

- [ ] Queue-jump P0: One-Way Structural Governance and Canonical Entrypoint Closure
  - Status rollback note (2026-03-21, reverted by: Codex)
  - Reason for rollback: blocking incomplete TODOs remain under the parent item; continuing to mark this as completed would hide the current true drift state.
  - Acceptance not met: `apps/backend/internal/http/wave1_web_routes.go` is still hand-written Web transport; `apps/website/src/pages/{projects,clients,tasks,tags,groups,permission-config}/*.tsx` still keep `Transition state` transitional copy; `packages/utils/src/index.ts` and `packages/utils/tests/index.test.ts` are still starter example implementations.
  - [x] Execution TODO: Remove the `pnpm -> node tools/self-hosted/cli.mjs -> docker compose` self-hosted wrapper layer. Self-hosted startup and verification are unified directly as `docker compose` plus explicit `curl` commands; no more `self-hosted:*` root scripts are retained. Refs: `AGENTS.md`, `docs/self-hosting/docker-compose.md`, `package.json`
  - [x] Execution TODO: Per the new `Code Principles` in `AGENTS.md`, clean up all duplicate internal entrypoints, duplicate naming, duplicate implementations, and internal compat aliases, establishing a "one responsibility / one canonical path / one canonical name / one canonical implementation" baseline. Refs: `AGENTS.md`, `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`, `docs/core/frontend-architecture.md`
  - [x] Execution TODO: Following the generation-first rule in `docs/core/backend-architecture.md`, close the current hand-written Web transport drift. Focus on hand-written `server.GET/POST/...`, `context.Bind(...)`, and placeholder route registrations in `apps/backend/internal/http/wave1_web_routes.go`, migrating to generated route/DTO/handler interface/validator boundaries sourced from `openapi/opentoggl-web.openapi.json`. Until this is done, no new endpoint may be added to the hand-written route table. Refs: `docs/core/backend-architecture.md`, `docs/core/codebase-structure.md`, `openapi/opentoggl-web.openapi.json`
  - [ ] Execution TODO: Close the env / dependency entry for local source-based startup, fixing "root `.env.local` + explicit datasource env + real dependencies" as the single default path. When `.env.local` or key datasource env is missing, `air` startup must fail immediately; it is forbidden to keep the backend surface startable via default DSN, in-memory store, placeholder runtime, or fake dependency. Refs: `AGENTS.md`, `README.md`, `docs/core/architecture-overview.md`, `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`
  - [ ] Execution TODO: Delete or downgrade low-signal bootstrap/config unit tests, to avoid locking infra/config rules such as env loading, default fallback, and bootstrap field pass-through into TDD-style assertions. First batch: `apps/backend/internal/bootstrap/config_env_test.go`, and cases in `apps/backend/internal/bootstrap/bootstrap_test.go` that only verify `ConfigFromEnvironment` mapping, defaults, and platform handle pass-through. Replacement evidence should be direct startup checks, readiness checks, and minimal smoke runtime evidence. Refs: `AGENTS.md`, `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`
  - [ ] Execution TODO: Per the Figma/fallback alignment rules in `docs/core/frontend-architecture.md` and the corresponding `docs/product/*.md`, close the current drift in formal page families. Focus on the still-present `Transition state` narrative and placeholder-style page skeletons in `apps/website/src/pages/projects/ProjectsPage.tsx`, `apps/website/src/pages/clients/ClientsPage.tsx`, `apps/website/src/pages/tasks/TasksPage.tsx`, `apps/website/src/pages/tags/TagsPage.tsx`, `apps/website/src/pages/groups/GroupsPage.tsx`, `apps/website/src/pages/permission-config/PermissionConfigPage.tsx`. Until this is done, these pages may not claim formal completion, and may not continue to substitute transition-state copy for Figma/fallback alignment evidence. Refs: `docs/core/frontend-architecture.md`, `docs/product/tracking.md`, `docs/product/membership-and-access.md`, `docs/core/testing-strategy.md`
  - [ ] Execution TODO: Close frontend URL state to the single path `routes/ + shared/url-state/`.
    - Current scope: `apps/website/src/pages/tasks/TasksPage.tsx`, `apps/website/src/routes/route-tree.tsx`, `apps/website/src/shared/url-state/`
    - Target state: pages must not directly call `new URLSearchParams(...)`, read `location.searchStr` ad hoc, or parse search params inside the page; `projectId` and other search params must enter pages through `validateSearch` / schema; pages only consume normalized route/search input.
    - Blocking rule: until this is done, no new filter, sort, pagination, or view-switch capability may be expanded.
    - Acceptance evidence: corresponding page-flow covers `route enter / reload / share / back-forward` consistency, and no longer depends on hand-written URL adapters. Refs: `docs/core/frontend-architecture.md`, `docs/core/testing-strategy.md`, `apps/website/src/pages/tasks/TasksPage.tsx`, `apps/website/src/routes/route-tree.tsx`, `apps/website/src/shared/url-state/`
  - [ ] Execution TODO: Complete the formal logout chain for Web identity/session.
    - Current scope: `apps/website/src/shared/query/web-shell.ts`, `apps/website/src/app/AppShell.tsx`, `apps/website/src/routes/route-tree.tsx`
    - Target state: the frontend must implement the `/web/v1/auth/logout` mutation, a navigation entry, clearing of `web-session` and related query cache on success, and a formal user flow that jumps back to `/login`; login/register alone, missing logout, is not acceptable.
    - Blocking rule: until this is done, Wave 1's identity/session Web capability cannot be claimed complete, and new navigation entries that depend on login state must not be added without providing a logout path.
    - Acceptance evidence: a discoverable logout entry exists; clicking it calls `/web/v1/auth/logout`, clears session-related cache, and protected pages return to unauthenticated state; at least one auth page-flow and one real-runtime/e2e piece of evidence are added. Refs: `docs/product/identity-and-tenant.md`, `docs/core/architecture-overview.md`, `openapi/opentoggl-web.openapi.json`, `docs/core/testing-strategy.md`, `apps/website/src/shared/query/web-shell.ts`, `apps/website/src/app/AppShell.tsx`, `apps/website/src/routes/route-tree.tsx`
  - [ ] Execution TODO: Move the protected-Web-page session fallback, currently provided mainly by the component-level `AuthenticatedAppFrame`, to route-level guard/redirect in `routes/`.
    - Current scope: `apps/website/src/app/AuthenticatedAppFrame.tsx`, `apps/website/src/routes/route-tree.tsx`, `apps/website/src/pages/auth/AuthPage.tsx`
    - Target state: `AuthenticatedAppFrame` retains only shell, providers, and composition of already-authenticated pages, and no longer carries the primary login-state branching; enter/invalidated session/401/403 redirect semantics for `/`, `/profile`, `/workspaces/$workspaceId/**`, and `/organizations/$organizationId/settings` are proven uniformly by routes.
    - Blocking rule: until this is done, no new protected page entry may be added.
    - Acceptance evidence: corresponding page-flow covers `route enter / reload / back-forward / expired session`; `AuthenticatedAppFrame` no longer carries the primary login-state branching. Refs: `docs/core/frontend-architecture.md`, `docs/product/identity-and-tenant.md`, `docs/core/testing-strategy.md`, `apps/website/src/app/AuthenticatedAppFrame.tsx`, `apps/website/src/routes/route-tree.tsx`, `apps/website/src/pages/auth/AuthPage.tsx`
  - [ ] Execution TODO: Sink the login/register mutation orchestration, transport-error parsing, and success-redirect logic currently held by `apps/website/src/pages/auth/AuthPage.tsx` into `features/auth`.
    - Current scope: `apps/website/src/pages/auth/AuthPage.tsx`, `apps/website/src/features/auth/AuthForm.tsx`, `apps/website/src/shared/query/web-shell.ts`
    - Target state: the page layer retains only route mode, layout, and feature composition; pages must no longer directly observe `WebApiError` or the underlying transport error shape; the auth feature uniformly emits page-safe error copy and success callbacks.
    - Blocking rule: until this is done, no new auth transport details or duplicated error-mapping logic may be added at the page layer.
    - Acceptance evidence: auth feature tests and page-flow tests updated in sync, proving error copy, success redirect, and session bootstrap behavior still hold. Refs: `docs/core/frontend-architecture.md`, `docs/product/identity-and-tenant.md`, `docs/core/testing-strategy.md`, `apps/website/src/pages/auth/AuthPage.tsx`, `apps/website/src/features/auth/AuthForm.tsx`, `apps/website/src/shared/query/web-shell.ts`
  - [x] Execution TODO: Close the root toolchain to a single canonical dev entrypoint name; delete alias or wrapper scripts that duplicate the canonical entrypoint. Known first batch: `dev` vs `dev:website` in root `package.json`, and alias narrative in the README. Closed by keeping only the explicit script name `dev:website`, deleting the duplicate root alias `dev`, and keeping only the canonical source-based startup command in the README. Refs: `AGENTS.md`, `README.md`
  - [x] Execution TODO: Clean up backward-compatible alias / helper / duplicate adapter in internal code; compat semantics must not continue to leak into `domain`, `application`, regular dev scripts, and default runtime. First batch completed (2026-03-21): `apps/backend/internal/membership/domain/workspace_member.go` removed the `WorkspaceMemberStateActive` internal alias; `apps/backend/internal/catalog/application/service.go` removed the duplicate helpers `AddProjectMember` and `CanViewProject`, consolidated to `GrantProjectMember` and `CanAccessProject`. Refs: `AGENTS.md`, `docs/core/backend-architecture.md`
  - [x] Execution TODO: Continue to strip placeholder / transitional runtime from default implementation paths; until done, explicitly mark as debt and write the exit and delete conditions. Known first batch: `apps/backend/internal/http/wave1_web_routes.go`, `openapi/opentoggl-web.openapi.json`, `apps/backend/internal/bootstrap/wave2_placeholder_runtime_test.go`. Refs: `AGENTS.md`, `docs/core/frontend-architecture.md`, `docs/core/backend-architecture.md`
    - Current transitional debt (2026-03-21):
      - `apps/backend/internal/http/wave1_web_routes.go`
      - debt: still contains `registerWave2PlaceholderRoutes`; the default runtime continues to expose Wave 2 placeholder endpoints
      - exit condition: the corresponding `/web/v1/projects`, `/clients`, `/tasks`, `/tags`, `/groups`, `/permissions`, `/members` and similar paths are all taken over by OpenAPI + module transport registrar
      - delete condition: `registerWave2PlaceholderRoutes` has no remaining call site, and project/catalog/membership pages and runtime no longer depend on its placeholder routes
      - `openapi/opentoggl-web.openapi.json`
      - debt: still contains `current placeholder web shell slice` / transitional descriptions; some paths only cover a minimal temporary slice
      - exit condition: corresponding pages reach formal product-surface alignment, contract descriptions become formal semantics, and cover promised capabilities such as archive/pin/detail/permission
      - delete condition: all placeholder / transition descriptions are removed from the contract, and placeholder semantics are no longer used to describe formal paths
      - `apps/backend/internal/bootstrap/wave2_placeholder_runtime_test.go`
      - debt: tests still use the placeholder runtime as baseline, locking in a fake runtime
      - exit condition: real module integration, generated contract, and real-runtime HTTP / e2e evidence cover the same capability chain
      - delete condition: the corresponding placeholder runtime path is deleted, and the same capability is covered by formal runtime tests
  - [x] Execution TODO: Clean up placeholder / transitional semantics in the `opentoggl-web` formal contract and generated artifacts; rewrite the corresponding summary/description in `openapi/opentoggl-web.openapi.json` with formal product semantics, and regenerate `packages/shared-contracts/src/generated/web-contracts.generated.ts`. Placeholder copy must not continue to leak out through the formal contract. Refs: `AGENTS.md`, `openapi/opentoggl-web.openapi.json`, `packages/shared-contracts/package.json`
  - [x] Execution TODO: Synchronize closure of assertions and naming that lock placeholders into the test baseline; remove institutionalized "Wave 2 placeholder slice" phrasing from the backend standalone TS/OpenAPI test harness, and replace it with assertions targeting formal contract / runtime takeover. Refs: `AGENTS.md`, `docs/core/testing-strategy.md`, `openapi/opentoggl-web.openapi.json`
  - [ ] Execution TODO: Close the current conflict between shared-contracts test responsibility and `openapi/opentoggl-web.openapi.json`; tests already require the formal web contract source to contain no `placeholder` copy, so we must either decide to rewrite the source + generated artifact to the formal contract, or redefine test responsibility along documented boundaries. Source and test must not keep contradicting each other long term. Refs: `docs/core/backend-architecture.md`, `docs/core/frontend-architecture.md`, `openapi/opentoggl-web.openapi.json`
  - [ ] Execution TODO: Evaluate whether `packages/utils` still has an in-project responsibility; currently not only its metadata was once a starter template, but `packages/utils/src/index.ts` and `packages/utils/tests/index.test.ts` are still starter example implementations. If there is no clear consumer or boundary, delete the entire workspace package; if kept, add real responsibility description, canonical naming, and minimal actual usage. It must not continue to drift as a starter-template-shaped package. Refs: `AGENTS.md`, `packages/utils/package.json`, `packages/utils/src/index.ts`, `packages/utils/tests/index.test.ts`, `pnpm-workspace.yaml`
  - [x] Blocking rule: until the above P0 items are closed, do not add any related feature, route, script, helper, alias, placeholder runtime, or second implementation path.

- [x] Wave 0: Engineering Foundation and Generation Chain
  - [x] Baseline landed: `apps/backend`, `apps/website`, `packages/web-ui`, `packages/shared-contracts`
  - [x] Initial contract skeletons landed: `opentoggl-web` / `opentoggl-import` / `opentoggl-admin`
  - [x] Root-level verification entrypoints currently work: `vp test`, `vp check`, `go test ./apps/backend/...`
- [x] Local Development Baseline
  - [x] Local development has been closed to repository-root source startup chains and root-level env; root-level `scripts/*.sh` are no longer accepted as the default dev entrypoint
- [ ] Wave 1: Identity, Session, Tenant, Billing Foundation and App Shell
  - Status rollback note (2026-03-21, reverted by: Codex)
  - Reason for rollback: the parent wave's exit criteria directly conflict with the structural-drift list already recorded in the current repository; continuing to mark this as completed would hide the reality that "the formal source of truth has not fully taken over transport/runtime."
  - Acceptance not met: Wave 1 exit criteria require `feature gate, quota header and capability check already provided by billing as formal source of truth`; however the same plan document's current remediation list explicitly states that `apps/backend/internal/http/wave1_web_tenant_handlers.go` still hardcodes `plan/quota/capability/admin` semantics at the transport layer, and `apps/backend/internal/http/wave1_web_handlers.go` / `wave1_web_runtime.go` still use fake runtime as the default assembly baseline. Therefore this wave cannot be considered to have satisfied its overall exit criteria.
  - [x] Wave 1 Web contract extension: `openapi/opentoggl-web.openapi.json`
  - [x] First version of the `billing-foundation` backend foundational slice
  - [x] First version of the `tenant-backend` backend foundational slice
  - [x] `identity-backend` slice fully through gate
  - [x] `identity-tenant-web` slice fully through gate
  - [x] Login page now has a discoverable registration entry and redirect, so `/login` is not a dead end for the registration flow
  - [ ] All Wave 1 overall exit criteria met
    - Status rollback note (2026-03-21, reverted by: Codex)
    - Reason for rollback: current code is still inconsistent with the Wave 1 exit criterion "billing as formal source of truth takes over capability/quota/gate."
    - Acceptance not met: the current remediation list in `docs/plan/2026-03-20-opentoggl-full-implementation-plan.md` explicitly states that `apps/backend/internal/http/wave1_web_tenant_handlers.go` still hand-writes `workspacePermissionsBody/organizationBody/workspaceBody/capabilityBody/quotaBody` at the transport layer and hardcodes plan/quota/capability/admin semantics; this directly conflicts with the Wave 1 exit criterion that "feature gate, quota header and capability check are already provided by billing as formal source of truth, and default-all-open placeholder implementations are no longer allowed."
- [ ] Wave 1.5: UI/Figma Alignment and Placeholder Implementation Exit Gate
  - Status rollback note (2026-03-21, reverted by: Codex)
  - Reason for rollback: the parent wave's required UI baseline and evidence chain are not yet met; continuing to mark this as completed would hide obvious closure gaps beyond `shell/profile/settings`.
  - Acceptance not met: the Wave 1.5 exit criteria in `docs/plan/2026-03-20-opentoggl-full-implementation-plan.md` still require `packages/web-ui` to form a reusable application-level UI baseline, loading/error/empty/success notice to enter the shared UI baseline, and `shell/profile/settings` to submit screenshot/evidence. The current repository still only has a very thin `AppPanel/AppButton/theme` wrapping, and the plan's evidence table explicitly lists missing shell/profile/settings screenshot evidence.
  - [x] Execution TODO: The shared app shell, `profile`, and `settings` complete formal page-skeleton alignment per the referenced PRD/Figma nodes, no longer retaining development-stage hero, Wave copy, or placeholder/contract-backed/tracer shell narratives. Refs: `docs/product/identity-and-tenant.md`, `docs/product/tracking.md`, `docs/core/frontend-architecture.md`
  - [x] Execution TODO: Establish and submit a `PRD -> Figma node -> implementation page -> page flow/e2e -> screenshot/evidence` comparison for `shell`, `profile`, and `settings`. Refs: `docs/core/testing-strategy.md`, `docs/core/frontend-architecture.md`
    - Current evidence summary (2026-03-21):
      - `shell`: has page flow, E2E, real-runtime E2E; screenshot evidence still missing
      - `profile`: has page flow; standalone E2E and screenshot evidence still missing
      - `settings`: has page flow; standalone E2E and screenshot evidence still missing
  - [x] Execution TODO: For the `project`, `client`, and member/permission-related pages to be expanded in Wave 2, fill in the `PRD/Figma or fallback skeleton source` list; feature expansion must not continue on top of placeholder pages. Refs: `docs/core/frontend-architecture.md`, `docs/testing/bdd-user-stories.md`
    - Wave 2 source summary:
      - `project`, `client`: PRD/Figma sources already exist, can be used directly as formal page input
      - `tasks`, `tags`: use `project page` as fallback skeleton; do not start another placeholder page family
      - `members`, `permission-config`, `groups`: may only reuse the `left nav` shared shell; main body remains blocked until a dedicated Figma or doc-specified fallback is provided
  - [x] Execution TODO: Remove completion phrasing such as `placeholder slice`, `contract-backed shell`, `Wave x slice` from formal pages; incomplete pages must be explicitly marked as transitional with a written exit condition. Refs: `docs/core/frontend-architecture.md`
  - [x] Execution TODO: Audit whether the current page layer directly calls low-level APIs, directly consumes raw DTOs, or bypasses the `feature/entity` layering; build a remediation list for discovered violations, and prioritize closure before continuing page expansion. Refs: `docs/core/frontend-architecture.md`, `docs/core/codebase-structure.md`
    - Current audit summary (2026-03-21):
      - P0 violations: `ProjectsPage`, `PermissionConfigPage`
      - Second priority: `WorkspaceMembersPage`, and the `clients/groups/tasks/tags` page families' create flow / raw DTO rendering still sit in the page
      - Ongoing governance direction: `profile/settings/auth` continue to sink mutations, error feedback, and submit flow into features; `WorkspaceOverviewPage`, `WorkspaceReportsPage` temporarily recorded as `none found yet`
      - Execution rule: fix `ProjectsPage` and `PermissionConfigPage` first, then uniformly extract features and entities for members / catalog page families; until this batch is closed, do not continue to expand `project/client/task/tag/group/member/permission-config` page capabilities
  - [x] Execution TODO: Audit transitional implementations in `transport/http/*` that still carry business state, pseudo-repositories, hand-written DTO / route / bind; build an "OpenAPI/modular closure" remediation list, and forbid adding new capabilities on top of fake runtime. Refs: `docs/core/backend-architecture.md`, `docs/core/codebase-structure.md`
    - Confirmed transitional implementations and remediation list (2026-03-21):
      - `apps/backend/internal/http/wave1_web_handlers.go`
      - Observation: `Wave1WebHandlers` + `wave1State` directly hold cross-request business state at the transport layer — `users/sessions/homes/workspaceMembers/workspaceProjects/...` — plus ID counters, seed data, and `sessionBootstrap/profileBody/preferencesBody/...` response assembly.
      - Risk: the HTTP shell simultaneously carries fake runtime, pseudo-repository, business state machine, and hand-written DTO output; continued expansion would further lock identity / tenant / membership / catalog facts into transport.
      - Remediation: stop adding endpoints / fields / business rules to this file; close register/login/session/profile/preferences bootstrap into the module-level `application + transport/http/web|compat`; keep this only as a transitional test stub until the corresponding OpenAPI generation boundary and module handler take over.
      - `apps/backend/internal/http/wave1_web_tenant_handlers.go`
      - Observation: tenant/membership/catalog-related read and write directly manipulate `wave1State`, hand-write `workspacePermissionsBody/organizationBody/workspaceBody/capabilityBody/quotaBody` at the transport layer, and hardcode plan/quota/capability/admin semantics.
      - Risk: this file is essentially a pseudo application-service/pseudo-repository aggregation of tenant + membership + catalog; both the public response shape and business rules bypass module boundaries and OpenAPI.
      - Remediation: migrate organization/workspace settings, permissions, members, projects/clients/tasks/tags/groups back to their respective modules item by item; convert body mappers to module transport adapters; change plan/quota/capability to call real billing/tenant/membership/catalog services; no new list / write path may be added in this file.
      - `apps/backend/internal/http/wave1_web_routes.go`
      - Observation: hand-written `/web/v1/*` route table, `context.Bind(...)`, `parsePathID(...)`, query parse, cookie/session handling, and quota header mapping; `registerWave2PlaceholderRoutes` explicitly carries Wave 2 placeholder runtime.
      - Risk: routes, bind, validate, DTO, and header rules all remain in the hand-maintained layer, already conflicting with the `generation-first` requirement; adding more routes only amplifies OpenAPI drift.
      - Remediation: generate web route/DTO/handler interface/validator from `openapi/opentoggl-web.openapi.json`; retain existing hand-written routes only as unclosed transitional items; endpoints under `registerWave2PlaceholderRoutes` may not be expanded until OpenAPI and module handlers are complete.
      - `apps/backend/internal/http/server.go`
      - Observation: `NewServer(..., wave1 *Wave1WebHandlers)` still directly couples the HTTP server with the Wave 1 fake runtime.
      - Risk: the root HTTP entrypoint cannot stay limited to host/runtime responsibility; this continues to reinforce "one big handler tree" instead of modular registration.
      - Remediation: reduce `server.go` to a health/static + generated/module route registration container; remove the special dependency on `Wave1WebHandlers`; bootstrap injects each module's transport registrar.
      - `apps/backend/internal/bootstrap/app.go`, `apps/backend/internal/bootstrap/wave1_web_runtime.go`
      - Observation: `NewApp` still makes `newWave1WebHandlers()` part of the formal application assembly, treating fake runtime as a first-class citizen.
      - Risk: the bootstrap SSOT continues to point at the transitional runtime, making it easier for subsequent subsystems to hook into the fake handler directly rather than the module service.
      - Remediation: change bootstrap to explicitly assemble the identity/tenant/membership/catalog/billing module services and transport handlers; `wave1_web_runtime.go` should be deleted once modules take over; no new `waveX_*_runtime.go` fake-assembly entrypoints may be added.
      - `apps/backend/internal/bootstrap/wave2_placeholder_runtime_test.go`, `apps/backend/internal/bootstrap/wave1_web_runtime_test.go`
      - Observation: tests currently target "placeholder/current runtime slice," validating fake-runtime state evolution rather than OpenAPI/generated transport + real module wiring.
      - Risk: this would lock placeholder implementations into the acceptance baseline, masking structural drift.
      - Remediation: gradually migrate such tests to module integration, generated contract, and real-runtime HTTP smoke; delete placeholder runtime tests once modules take over; do not add similar fake-runtime coverage for new wave capabilities.
      - Blocking rule: until the list above starts being closed, no new product capability may be added in `apps/backend/internal/http/wave1_web_handlers.go`, `apps/backend/internal/http/wave1_web_tenant_handlers.go`, `apps/backend/internal/http/wave1_web_routes.go`, or `apps/backend/internal/bootstrap/wave1_web_runtime.go`; a new endpoint must first land in OpenAPI and then in module transport.
  - [x] Execution TODO: Add at least one real-runtime verification chain covering shell login-to-workspace entry, to avoid contract test / mocked page flow false-green hiding real runtime breakage. Refs: `docs/core/testing-strategy.md`
    - Current real-runtime evidence: `apps/website/e2e/app-shell.real-runtime.spec.ts`
    - Covered chain: `/register` register -> enter `Workspace Overview` -> clear cookie -> `/login` login -> `GET /web/v1/session` -> re-enter `Workspace Overview`
    - Constraint: the spec explicitly waits for real `/web/v1/auth/register`, `/web/v1/auth/login`, `/web/v1/session` responses, not API stubs
  - [x] Until this gate is closed, Wave 2 formal page-family and runtime-endpoint slices may not be expanded

- [ ] Pre-Wave-2 Structural, Backend Usability, and Delivery Baseline Closure Gate
  - Recommended parallel streams (parallel work allowed when write sets do not overlap)
    - `contract-boundary-repair`
      - ownership: `apps/backend/internal/http/*`, `openapi/opentoggl-web.openapi.json`, `packages/shared-contracts/*`
      - scope: hand-written Web transport -> generated boundary closure; closure of conflicts between shared-contracts and OpenAPI
      - blockers: until this stream is complete, no new endpoint may be added on top of the hand-written route table
    - `backend-env-and-startup`
      - ownership: `apps/backend/internal/bootstrap/*`, root `.env*`, README
      - scope: make root `.env.local` required, standardize env naming, require explicit datasource env, delete low-signal bootstrap/config tests, produce direct startup evidence
      - note: can run in parallel with frontend/Figma closure, but do not cross-modify the same bootstrap file with `backend-runtime-observability`
    - `backend-runtime-observability`
      - ownership: `apps/backend/internal/http/*`, `apps/backend/internal/bootstrap/*`
      - scope: startup log, request log, make `/readyz` real, dependency-failure diagnostic logs, minimal smoke evidence
      - note: partially overlaps write sets with `backend-env-and-startup`; if parallel, file ownership must be explicit; default recommendation is to split into separate files first, then parallelize
    - `web-parity-recovery`
      - ownership: `apps/website/src/pages/{projects,clients,tasks,tags,groups,permission-config}/*`
      - scope: close `Transition state` page families against Figma/fallback
      - note: can run in parallel with backend streams, but this alone is not a basis for claiming Wave 2 formal completion
    - `workspace-cleanup`
      - ownership: `packages/utils/*`
      - scope: delete or formalize the starter template package
      - note: can run in parallel with all streams above, provided no new shared dependency is introduced
  - [x] Before Wave 2, complete backend directory structure closure: `apps/backend/main.go + apps/backend/internal/*`. Refs: `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`
  - [x] Before Wave 2, complete backend startup command closure: `air`. Refs: `AGENTS.md`, `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`
  - [ ] Before Wave 2, fix the minimum standard for "backend is working": `air`, database migration, default config injection, first-admin initialization, real dependency readiness, and minimal smoke test must form a repeatable chain; standalone hot-reload startup or a static `200 OK` is no longer accepted as complete. Refs: `docs/core/architecture-overview.md`, `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`, `docs/self-hosting/docker-compose.md`, `docs/product/instance-admin.md`
    - Current gaps (2026-03-21):
      - The repository already has an `.env.example` template, but the rule "root `.env.local` is a required prerequisite, and missing datasource env must fail startup" has not yet formally landed in code or verification.
      - `apps/backend/internal/bootstrap/app.go` still makes `newWave1WebHandlers()` part of the default usable backend assembly via fake runtime; the repeatable "real dependency + formal migration/init" working chain has not formed yet.
      - `apps/backend/internal/bootstrap/config_env.go` currently only handles env loading and default config fallback, and does not cover database migration, first-admin initialization, or default instance-config injection.
      - `apps/backend/internal/bootstrap/config_env_test.go` and `apps/backend/internal/bootstrap/bootstrap_test.go` still retain a batch of low-signal config/bootstrap unit tests whose focus is env mapping and field pass-through, rather than directly proving the real startup chain.
      - Next concrete work item: split the current gate into three streams `backend-env-and-startup`, `backend-runtime-observability`, `contract-boundary-repair` and push them in parallel; env/startup, request log/readiness, and generated boundary are accepted independently, then converge into a single release-readiness gate.
  - [x] Before Wave 2, close the self-hosted single-image runtime direction; the `website + api` dual-runtime is no longer the target form. Refs: `docs/core/architecture-overview.md`, `docs/self-hosting/docker-compose.md`
  - [x] Before Wave 2, unify documentation, README, sample commands, and smoke test phrasing. Refs: `AGENTS.md`, `README.md`, `docs/self-hosting/docker-compose.md`
  - [x] Closure summary: the backend directory has been migrated from `apps/api` to `apps/backend`; the local source-based startup command is unified to root-level `air`; root-level `.air.toml` has become the single hot-reload source of truth; related docs, README, sample commands, workspace metadata, test assets, and old aliases have been closed in sync. Refs: `AGENTS.md`, `README.md`, `docs/core/codebase-structure.md`, `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`
  - [x] Self-hosted summary: the target form is closed to a single Go application image that embeds the frontend build and serves both Web UI and API; `website` / Nginx dual-runtime assets have been deleted; `docker compose` has been closed to `opentoggl + postgres + redis`; SPA static asset serving, history fallback, single-image `Dockerfile`, and build-time embedding chain have been established. Refs: `docs/core/architecture-overview.md`, `docs/core/backend-architecture.md`, `docs/self-hosting/docker-compose.md`
  - [ ] Execution TODO: Add a default request log middleware for `apps/backend/internal/http`, logging at least method, path, status, duration, and the available subset of request id / trace correlation fields. This item belongs to the `backend-runtime-observability` stream independently; until done, the backend runtime may not be claimed to have reached a "working" baseline. Refs: `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`
  - [ ] Execution TODO: Add default diagnostic logs for backend startup success, dependency failure, and readiness failure; this item belongs to the `backend-runtime-observability` stream independently and is no longer bundled with smoke test into a single broad TODO. Refs: `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`
  - [ ] Execution TODO: Add the formal process with `pgschema` as the single PostgreSQL schema management path, including desired-state schema, `plan/apply` workflow, first-admin initialization, and default config injection; the process must be repeatable for new environments and must not depend on manual database tweaks or ad hoc shell steps. Refs: `docs/self-hosting/docker-compose.md`, `docs/product/instance-admin.md`, `docs/core/backend-architecture.md`
  - [ ] Execution TODO: Close `/readyz` from a static health snapshot to real runtime checks, covering at minimum database reachability, Redis reachability, and required config loaded; `/healthz` may remain lightweight but must no longer share the same completion wording as readiness. Refs: `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`
  - [ ] Execution TODO: Fix the minimal smoke test to cover at least container start, home page reachable, SPA route reachable, `/web/v1/session`, `/healthz`, `/readyz`, and require the smoke test to explicitly distinguish "process started" from "dependencies ready." Startup log, request log, and readiness/dependency-failure diagnostic logs have been split into independent TODOs and are no longer implicit sub-items of this smoke TODO. Refs: `docs/core/testing-strategy.md`, `docs/self-hosting/docker-compose.md`, `docs/core/backend-architecture.md`
  - [ ] Execution TODO: Complete single-image release-path verification, covering at least image build, container start, database migration/initialization complete, home page reachable, SPA route reachable, `/web/v1/session`, `/healthz`, `/readyz`. Refs: `docs/self-hosting/docker-compose.md`, `docs/core/architecture-overview.md`
  - [ ] Execution TODO: Document upgrade/rollback steps, persistent volumes, and required environment variables, to avoid "can start the local source process" being mistaken for a deliverable self-hosted release. Refs: `docs/self-hosting/docker-compose.md`, `README.md`
  - Convergence rule: only when `backend-env-and-startup`, `backend-runtime-observability`, and `contract-boundary-repair` each pass their acceptance criteria may the final release-readiness acceptance begin; they must not be re-serialized into a single-threaded sequential blocker.
  - [ ] Until this gate is closed, formal feature expansion for Wave 2 and subsequent waves may not continue
- [ ] Wave 2: Membership, Access, Catalog Full Product Surface (in progress: first contracts + backend core + web pages + runtime endpoints slice complete; prerequisite: first pass the "Pre-Wave-2 Structural and Delivery Baseline Closure Gate")
  - Current gaps (2026-03-21, after verification): formal product-surface alignment of `project` still does not meet Wave 2 exit criteria. Current Web can only verify the `/workspaces/$workspaceId/projects` list page, and the implementation and page-flow are still explicitly labeled `Transition state`, missing the documented filters, archive/pin controls, and task/detail entry points; `openapi/opentoggl-web.openapi.json` currently only covers `/web/v1/projects` and `/web/v1/projects/{project_id}/members*`, and does not yet include required contracts such as `pin/unpin`, `templates`, `stats/periods`. Next concrete work: close the `project page` as a formal page first, and synchronously fill in the corresponding Web contract, runtime, and test evidence.
- [ ] Wave 3: Tracking Core Transaction Surface
- [ ] Wave 4: Tracking Extension Surface and Governance
- [ ] Wave 5: Reports Read Model and Sharing
- [ ] Wave 6: Webhooks Runtime
- [ ] Wave 7: Billing Commercial Views, Invoices, and Closure
- [ ] Wave 8: Importing Migration Closed-Loop
- [ ] Wave 9: Instance Admin / Platform Operations
- [ ] Wave 10: Compatibility Closure and Release Preparation
- [ ] Ongoing Maintenance of the Test Plan and Story List
  - [ ] Establish the BDD story entry: `docs/testing/bdd-user-stories.md`
  - [ ] Establish a `BDD Story -> Test Coverage` mapping list: map each item in `docs/testing/bdd-user-stories.md` to `Domain Unit / Application Integration / Transport Contract / Frontend Feature / Frontend Page Flow / E2E / Golden`, tag `covered / partially covered / missing`, and manage gaps as blockers for subsequent waves
  - [ ] Before each Wave starts, map the corresponding product-surface stories to `Domain / Integration / Contract / Feature / Page Flow / E2E / Golden`
  - [ ] At the end of each Wave, update the "covered stories / uncovered stories / deferral reason" list
  - [ ] Before Wave 10, fill in the page flow and e2e that `testing-strategy` requires but have not been implemented
  - [ ] For every formal page family, establish a `PRD -> Figma node -> page implementation -> page flow/e2e` mapping list
- [ ] Self-hosted and Release Delivery Chain (structural and runtime closure portions must be complete before Wave 2)
  - [x] Clearly specify the self-hosted target delivery form: a single Go application image, embedding frontend `dist` at build time, with the same runtime serving both Web UI and API
  - [ ] Pre-Wave-2 blockers have been moved to the "Pre-Wave-2 Structural, Backend Usability, and Delivery Baseline Closure Gate" and must not be treated as loose tail items in later waves
  - [ ] Wave 10 produces formal release artifacts: image, compose file, sample env, release notes

## 1. Plan Basis

This plan uses the following documents as authoritative input; in case of conflict, they are interpreted in this order:

1. `docs/core/product-definition.md`
2. `docs/product/*.md`
3. `openapi/toggl-track-api-v9.swagger.json`
4. `openapi/toggl-reports-v3.swagger.json`
5. `openapi/toggl-webhooks-v1.swagger.json`
6. Figma prototypes
7. `docs/core/domain-model.md`
8. `docs/core/architecture-overview.md`
9. `docs/core/codebase-structure.md`
10. `docs/core/backend-architecture.md`
11. `docs/core/frontend-architecture.md`
12. `docs/core/testing-strategy.md`
13. `docs/testing/bdd-user-stories.md`
14. `docs/self-hosting/docker-compose.md`

This plan does not rewrite product semantics; it only reduces these definitions to an executable implementation blueprint.

## 2. Current State Assessment

The current repository is still at the starter stage:

- `apps/website` is still a default Vite template, not a formal Web application.
- `apps/backend`, `packages/web-ui`, `packages/shared-contracts` do not yet exist.
- `openapi/` already has Toggl compat definitions, but transport, contract test, golden test, and runtime have not yet landed.
- The existing tests cannot support any product-surface acceptance.

Therefore this is not an incremental refactor plan but a greenfield implementation plan under strong documentation constraints.

## 3. Non-Negotiable Implementation Constraints

### 3.1 Product Constraints

- OpenToggl v1 directly takes the Toggl public product surface as its own product definition; local reinterpretation such as "like Toggl" is not allowed.
- Low-frequency capabilities also belong to the formal product surface and cannot be deferred as unimplemented placeholders just because they are rarely used.
- Cloud and self-hosted must share the same public contract and feature surface.
- `import` and `instance-admin` are part of OpenToggl v1's formal product surface, not scripts or ops handbooks.

### 3.2 Architecture Constraints

- Backend bounded contexts are fixed as: `identity`, `tenant`, `membership`, `catalog`, `tracking`, `governance`, `reports`, `webhooks`, `billing`, `importing`, `platform`.
- Dependency direction is fixed as:
  - `web page -> feature -> entity/shared`
  - `transport -> application -> domain`
  - `infra -> application / domain`
  - `all modules -> platform`
- Explicitly forbidden:
  - `platform -> business module`
  - `domain -> transport`
  - `domain -> SQL / Redis / HTTP client`
  - `page -> raw backend DTO`
  - `feature -> feature`
  - `module A/infra -> module B/infra`
- The main write path must complete the primary business write, audit record, and job record in a single PostgreSQL transaction.
- Reports projection, webhook delivery, export generation, import continuation, etc. must run asynchronously, driven by job records written in the same transaction.

### 3.2.1 Frontend and Figma Alignment Constraints

- Any formal page bound to a Figma prototype or node ID in `docs/product/*.md` must take Figma as implementation input, not just "assemble a page" from interfaces and fields.
- The frontend implementation must align, in order of priority:
  - Page information architecture
  - Primary/secondary region layout
  - Formal entries and navigation relationships
  - Key interaction states
  - Empty/loading/error states
  - Filters, header, and workspace context shared with the same route family
- You are not allowed to claim a page complete by "first ship a generic form/list placeholder page and then slowly attach Figma later."
- If a formal page has no corresponding Figma node in PRD:
  - The task packet must explicitly state "no dedicated Figma node at present"
  - It must reference a reusable neighboring page prototype or a doc-specified skeleton source
  - It must not invent another information architecture that conflicts with the existing product language
- Page completion acceptance does not only check whether data can be submitted, but also whether the page keeps the same page semantics declared in the PRD's Figma prototype.

### 3.3 Testing Constraints

- Tests are the primary acceptance mechanism and do not rely on manual QA as a safety net.
- Test design must start from `docs/product/*.md` user stories, not an endpoint list.
- `docs/testing/bdd-user-stories.md` is the current consolidated acceptance-story entry; subsequent waves must continue to extend it rather than starting a parallel test semantics.
- The full test suite must remain a fast local gate, with total budget `<= 30s`.
- Tests must use real dependencies and real boundaries as much as possible; fake/stub only truly external systems.
- New features, bug fixes, and concurrency/idempotency/permission/edge rules must all have failing tests first.

### 3.4 Self-Hosted and Release Constraints

- Cloud and self-hosted share the same public contract and formal feature surface; you cannot shrink scope with "self-hosted ships with half the features."
- Frontend and backend must produce formal production builds and run as containerized artifacts; you may not piece together dev servers into a pseudo-production setup.
- self-hosted must at minimum provide:
  - Buildable image
  - Startable self-hosted `docker compose` stack
  - Database migration and first-admin initialization process
  - Persistent volume strategy
  - Health checks and basic smoke test
  - Upgrade and rollback instructions
- Wave 10 completion criteria must include "a new environment, started per the docs, can log in, enter a workspace, and pass basic health and smoke tests"; otherwise it is not releasable.

## 4. Mandatory Execution Model: Subagent-Driven Delivery

The default execution mode for this plan is not "the main agent implements items one by one itself," but "the main agent orchestrates, subagents produce."

### 4.1 Role Split

- `Orchestrator`
  - Reads the plan, maintains the dependency graph, task queue, completion state, and risks.
  - Prepares minimum-sufficient context per task instead of dumping the full conversation history into a worker.
  - Controls parallelism and avoids overlapping write sets.
  - Owns final acceptance, overall verification, and stage merges.
  - Must perform integration review with full context, not just trust the subagent's self-reported "done."
  - Runs repo hygiene, dependency direction, architecture boundary, bad-smell, and task-packet-drift checks on all subagent deliveries.
- `Story/Test Design Subagent`
  - Before each wave starts, reads the corresponding PRD, core docs, OpenAPI, and required Figma references.
  - Extracts the user stories, goals, failure branches, and key constraints in the PRD into the acceptance-story list for that wave.
  - Produces a per-story test mapping: `Domain Unit -> Application Integration -> Transport Contract -> Frontend Feature/Page Flow -> E2E -> Golden`.
  - Produces the task packets that downstream implementers consume, rather than writing business implementation directly.
- `Contract Generation Subagent`
  - For compat capabilities, generate transport, DTO, validator, contract skeleton, and golden skeleton based on the existing `toggl-*.swagger.json`.
  - For OpenToggl-specific capabilities, first maintain `opentoggl-web.openapi.json`, `opentoggl-import.openapi.json`, `opentoggl-admin.openapi.json`, then generate transport and contract skeletons from these OpenAPI sources.
  - Do not hand-author the public contract shape; the public contract is sourced from OpenAPI JSON files, then runtime boundaries are generated.
- `Implementer Subagent`
  - Owns only the file and responsibility boundaries assigned to it.
  - Must work in TDD, and attach test evidence and self-check results on handoff.
- `Spec Reviewer Subagent`
  - Only checks deviation from product docs, OpenAPI, Figma, architecture, and testing strategy.
- `Quality Reviewer Subagent`
  - Only checks implementation quality, boundaries, maintainability, test design, and regression risk.

### 4.2 Parallelism Principles

- Within a wave, only tasks with non-overlapping write sets may run in parallel.
- If two tasks would simultaneously modify the same module, same route tree, same OpenAPI file, or same shared package, they may not run in parallel.
- Parallelism priority order:
  1. Infrastructure skeleton and test skeleton
  2. Independent-context vertical slices
  3. Shared-layer convergence
  4. Cross-context integration
- If the harness supports it, use a separate worktree per parallel stream; otherwise enforce strict file ownership and forbid cross-modification.

### 4.3 Per-Task Delivery Protocol

Before each development task starts, the `Orchestrator` must prepare an explicit task packet. At minimum it contains:

1. Task name, goal, product surface
2. Corresponding PRD, core docs, OpenAPI, Figma/fallback skeleton source
3. User stories and corresponding test layers
4. File ownership and forbidden-touch scope
5. Acceptance commands and completion definition

Each implementer's handoff must at minimum contain:

1. List of owned files
2. Failing-test evidence
3. Minimal implementation description
4. Regression test and verification-command results
5. Remaining risks

Missing failing-test evidence or local verification result is treated as incomplete.

### 4.4 Per-Task Gate

The completion order for each task is fixed as:

1. Write failing test
2. Write minimum implementation and make it pass
3. Implementer self-check
4. Orchestrator integration review
5. Spec / quality review
6. Decide to merge or reject

`orchestrator` review is a hard gate, focusing only on five things:

- Whether it exceeds task-packet scope
- Whether it breaks dependency direction or module boundaries
- Whether it wrongly sinks business semantics into shared layers or generated artifacts
- Whether it introduces obvious bad smells or temporary implementations
- Whether the repository remains in a continuable-integration state

### 4.4.1 Rejection Rules

The following are rejected unconditionally; "merge first and tidy up later" is not allowed:

- Does not match task-packet scope
- Breaks one-way dependencies or module boundaries
- Introduces architecture drift
- Repository has unexplained dirty changes
- Test chain is missing layers, or there is no "fail first then pass" evidence
- Code has obvious bad smells that would pollute subsequent waves
- Sneaks in temporary implementations that will be hard to close later, just to pass the current task

A rejected task must:

1. Be fixed by the same implementer subagent according to review findings
2. Resubmit verification results
3. Go through the full `orchestrator -> spec reviewer -> quality reviewer` chain again

### 4.5 Per-Wave Startup Order

Each wave starts in the following order by default:

1. Extract stories and test mappings
2. Close contract boundaries
3. Backend implementation
4. Frontend implementation
5. Review and acceptance

If the first two are not done, feature implementation does not start.

## 5. Target Repository Structure

After the first round of structural adjustments, the repository should enter the following target state:

```text
apps/
  website/
  api/
    internal/
      bootstrap/
      http/
      web/

packages/
  web-ui/
  shared-contracts/
  utils/

backend/
  internal/
    identity/
    tenant/
    membership/
    catalog/
    tracking/
    governance/
    reports/
    webhooks/
    billing/
    importing/
    platform/

openapi/
  toggl-track-api-v9.swagger.json
  toggl-reports-v3.swagger.json
  toggl-webhooks-v1.swagger.json
  opentoggl-web.openapi.json
  opentoggl-import.openapi.json
  opentoggl-admin.openapi.json
```

The frontend must land as:

```text
apps/website/src/
  app/
  routes/
  pages/
  features/
  entities/
  shared/
```

## 6. Overall Implementation Strategy

We do not proceed "finish all backend first, then fill in frontend"; instead we advance by vertical-slice waves. Each wave must complete simultaneously:

- Backend domain / application / infra / transport
- Corresponding OpenAPI boundary or custom OpenAPI
- Web pages, features, page flow
- Corresponding test chain

Default wave rules:

- Frontend pages follow the Figma alignment constraints in §3.2.1, not repeated in each Wave
- Tests follow the unified test matrix in §8
- Public interfaces follow contract-first: first update OpenAPI, then generate boundaries, then enter implementation
- Only obviously cross-cutting capabilities are allowed to be built ahead of product waves separately

## 7. Wave Plan

### Wave 0: Engineering Foundation and Generation Chain

**Goal**

Evolve the repo from Vite starter to a monorepo baseline that can support formal product development.

**Scope**

- Create `apps/backend`
- Create `apps/backend/main.go`, `apps/backend/internal/bootstrap`, `apps/backend/internal/http`, `apps/backend/internal/web`
- Create the `apps/backend/internal/*` module skeletons and the `platform` infrastructure skeleton
- Establish a PostgreSQL Blob `filestore` abstraction, blob tables, and platform wiring, as the unified foundation for logo/avatar, expense attachment, report export, invoice artifact, and import archive
- Refactor `apps/website` into a React + Router + Query formal entrypoint
- Wire `tailwindcss@4` into the formal frontend runtime and clarify the division of responsibilities with `baseui/styletron`
- Create `packages/web-ui`, `packages/shared-contracts`
- Establish compat OpenAPI generation, contract test, and golden test skeletons
- Establish Web-specific OpenAPI: `opentoggl-web`, `opentoggl-import`, `opentoggl-admin`
- Establish a unified interface boundary for feature gate / quota / capability check, but before Wave 7 only allow a minimal placeholder implementation; gate rules must not scatter into business modules
- Establish the minimum test scaffolding and unified gate
- Establish the local-development baseline: repository-root source startup, root-level env conventions, no root-level local-development shell wrappers
- Establish the self-hosted containerized delivery skeleton: production builds, Dockerfile, compose, health/readiness, basic smoke script

**Recommended parallel streams**

- `api-foundation` subagent
  - `apps/backend`
  - `apps/backend/internal/platform`
  - `apps/backend/internal/bootstrap` / `http` / `web`
  - bootstrap / config / db / redis / filestore / job runner skeletons
- `web-foundation` subagent
  - `apps/website/src/app`
  - `apps/website/src/routes`
  - Tailwind CSS 4 runtime, global style entrypoint, and layout primitives
  - `packages/web-ui`
- `contracts-testing-foundation` subagent
  - `packages/shared-contracts`
  - compat transport generation pipeline
  - initial contract skeletons for `opentoggl-web` / `opentoggl-import` / `opentoggl-admin`
  - feature gate / quota header contract and test skeletons
  - contract/golden/e2e directories and fixture conventions
- `self-hosting-foundation` subagent
  - production image build skeleton
  - self-hosted `docker compose` baseline
  - health/readiness and minimal smoke commands
  - env/volume/migration/init conventions

**Dependencies**

- No upstream implementation dependency; this is the starting point of the entire plan.

**Exit Criteria**

- Root, API, and Web can each start a minimum formal runtime
- Local development can start frontend and backend source processes separately from the repository root, without depending on `docker compose`
- The backend source-based dev entrypoint is unified at root-level `air`, with hot reload managed by root-level `.air.toml`
- Local-development env is unified at the repository root, not scattered under `apps/*`
- The local-development entrypoint has not regressed to root-level `scripts/*.sh` wrappers
- The Web end has completed a `tailwindcss@4 + baseui + styletron` coexistence baseline, not deferred for later
- The OpenAPI generation chain is usable
- Compat and `opentoggl-*` custom contracts both have minimum generable skeletons
- capability check / feature gate has only a unified entrypoint, with no hardcoded branches scattered across modules
- The PostgreSQL Blob `filestore` can already be consumed by the application layer through a unified interface, rather than being added only when attachment-like features appear
- Test directories, naming, minimum fixtures, and concurrency strategy are fixed
- `docs/testing/bdd-user-stories.md` has become a test-design input rather than remaining only in session
- At least one buildable API/Website production image skeleton and self-hosted `docker compose` startup baseline
- health/readiness, migration entrypoint, and minimal smoke test commands are fixed
- `vp check`, `vp run test -r`, `vp run build -r`, and the Go test entrypoint all work

### Wave 1: Identity, Session, Tenant, Billing Foundation and App Shell

**Goal**

Connect user login state, current user, account profile, workspace/organization foundational objects, billing source of truth, and the site-wide shared app shell.

**Scope**

- `identity`
  - register / login / logout
  - basic auth compatibility
  - api token
  - current user / profile / preferences
  - deactivated / deleted semantics
- `tenant`
  - organization / workspace CRUD
  - workspace settings
  - branding assets
  - default currency, default rate, rounding, display policy
- `billing`
  - core factual model for plan / subscription / customer / quota / feature gate
  - unified truth for organization/workspace subscription view
  - basic implementation of quota header and capability check
- Web
  - login/register page
  - profile
  - settings
  - organization / workspace management pages
  - workspace logo / avatar management entry
  - left nav / workspace switcher / session bootstrap
  - The Figma main structure of `shell / profile / settings` lands directly; expansion via placeholder information architecture or temporary card stacks is not allowed
  - The minimum shared UI baseline in `packages/web-ui` is pulled forward into this wave: at minimum, page shell, section header, form field shell, notice/error/empty/loading state, nav item, list/table shell
  - Shared frontend structures for session/auth/url-state must close in sync with the formal pages above; they cannot be deferred to later waves

**Recommended parallel streams**

- `identity-backend` subagent
- `tenant-backend` subagent
- `billing-foundation` subagent
- `identity-tenant-web` subagent

**Dependencies**

- Depends on Wave 0 runtime, routing, contracts, and test skeletons.

**Exit Criteria**

- Users can enter a workspace
- Current user and workspace settings can be read and updated through API and Web
- Organization / workspace management and logo / avatar entries have formal page and contract support
- Deactivated users are prevented from continuing to log in and write business data
- Auto-stop semantics for a running timer during deactivation have test coverage
- feature gate, quota header, and capability check are formally provided by billing as the source of truth; "default-all-open placeholder implementation" is no longer allowed
- Shared app shell, `profile`, and `settings` have completed Figma main-structure and shared-state-component baseline closure; they no longer depend on placeholder information architecture, temporary hero copy, or card-stack-style transition pages
- `packages/web-ui` has the minimum shared UI baseline required to support Wave 2 page expansion; pages no longer piece together loading/error/empty/form/list/nav expressions ad hoc
- BDD stories in Wave 1 scope are mapped to page flow / e2e / contract / integration
  - Current Wave 1 coverage mapping (2026-03-21):
    - Login / register / session bootstrap
      - Page flow: `apps/website/src/pages/auth/__tests__/auth-page-flow.test.tsx`
      - Contract: `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/identity/transport/http/web/handler_test.go`
      - Integration: `apps/backend/internal/identity/application/identity_sessions_test.go`
      - E2E / real-runtime: `apps/website/e2e/app-shell.real-runtime.spec.ts`
    - Current user profile / preferences / API token
      - Page flow: `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx`
      - Contract: `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/identity/transport/http/web/handler_test.go`
      - Integration: `apps/backend/internal/identity/application/identity_sessions_test.go`
      - E2E: currently only indirectly covered by the shell real-runtime chain; a dedicated profile e2e is still missing
    - workspace / organization settings
      - Page flow: `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx`
      - Contract: `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/http/web_organization_settings_generated_test.go`
      - Integration: `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`, `apps/backend/internal/billing/application/billing_facts_test.go`
      - E2E: currently only indirectly covered by the shell real-runtime chain; a dedicated settings e2e is still missing
    - Shared app shell entering a workspace
      - Page flow: `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`
      - Contract: `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/identity/transport/http/web/handler_test.go`, `apps/backend/internal/http/web_organization_settings_generated_test.go`
      - Integration: `apps/backend/internal/identity/application/identity_sessions_test.go`, `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`
      - E2E / real-runtime: `apps/website/e2e/app-shell.spec.ts`, `apps/website/e2e/app-shell.real-runtime.spec.ts`
    - Deactivated-user login/write block and stop-running-timer semantics
      - Domain / integration: `apps/backend/internal/identity/domain/user_test.go`, `apps/backend/internal/identity/application/identity_sessions_test.go`
      - Runtime regression: `apps/backend/internal/bootstrap/wave1_web_runtime_test.go`
- The self-hosted `docker compose` baseline can start the services required by Wave 1, and complete the login + shell + health smoke test
- Remaining parity polish, screenshot/evidence submission, and cross-page propagation work for `shell`, `profile`, and `settings` may continue in Wave 1.5, but Wave 1 must not leave the shared UI baseline, core information architecture, and formal Figma main structure as leftover items

### Wave 1.5: UI / Figma Parity Polish and Evidence Closure

**Goal**

Before expanding Wave 2 page families further, close remaining parity details, screenshot/test evidence, and shared-UI propagation for the formal baseline pages already completed in Wave 1, so that subsequent page families are built on a unified structure and visual baseline, rather than continuing to expand while diverging.

Note: Wave 1.5 is not a place to catch up on the shared UI baseline, core information architecture, or `shell/profile/settings` main structure that should have been completed in Wave 1; those must be pulled forward into Wave 1. Wave 1.5 is only responsible for parity polish, evidence submission, and baseline propagation to Wave 2 page families.

**Scope**

- Shared app shell
  - Input: the Figma `left nav` node `8:2829` in `docs/product/tracking.md`
  - Fill in parity details and visual evidence for left nav, workspace switcher, profile/admin entries, and workspace context area under real state
  - Remove leftover development-stage hero, Wave copy, placeholder/contract-backed/tracer shell narrative after Wave 1 closure
- `profile`
  - Input: the Figma `profile` node `10:14814` in `docs/product/identity-and-tenant.md`
  - On the basis of formal information architecture already complete, fill in parity details and evidence for account-level status area, preferences area, token/security entry
- `settings`
  - Input: the Figma `settings` node `11:3680` in `docs/product/identity-and-tenant.md`
  - On the basis of formal page skeleton already complete, fill in area details, navigation relationships, branding entry parity and evidence for workspace / organization settings pages
- `packages/web-ui`
  - Propagate the shared UI baseline established in Wave 1 to the page families and state surfaces that Wave 2 will use
  - Continue to close tokens, spacing, state presentation, and boundaries between `tailwindcss@4` / `baseui/styletron`, so later pages do not each write their own visual language
- Figma alignment evidence
  - Establish a `PRD -> Figma node -> implementation page -> page flow/e2e -> screenshot/evidence` comparison for `shell`, `profile`, `settings`
  - For `project/client/tag` and member/permission-related pages, fill in the "current Figma/fallback skeleton source" list; feature expansion must not continue on top of placeholder pages

**Recommended parallel streams**

- `shell-parity-recovery` subagent
- `identity-settings-parity` subagent
- `web-ui-baseline-hardening` subagent
- `figma-parity-evidence` subagent

**Dependencies**

- Depends on Wave 1's identity, tenant, session, workspace settings, and shared app shell baseline.
- Until this wave is complete, formal pages such as `project / client / task / tag / members / permission` must not continue to expand on top of placeholder information architecture.

**Exit Criteria**

- The shared app shell, `profile`, and `settings` main structure and shared state expressions established in Wave 1 have completed parity polish and no longer retain development-stage explanation copy or temporary transitional states
- `packages/web-ui` has been promoted from Wave 1's minimum formal baseline into a unified application-level UI baseline that can support Wave 2 page families
- Key states such as loading / error / empty / success notice have not only been unified into the shared UI baseline but also have reuse landings on Wave 2 page families about to be expanded
- `shell`, `profile`, `settings` have submitted a `PRD -> Figma node -> implementation page -> test -> screenshot/evidence` comparison
- Formal pages about to be expanded in Wave 2 have their respective Figma references or fallback skeleton sources filled in, no longer keeping "placeholder slice" as the basis of completion

### Wave 2: Membership, Access, Catalog Full Product Surface

**Goal**

Establish the authorization, member lifecycle, and directory objects that all later tracking, reports, and webhooks depend on, and bring projects / clients / tasks / tags to formal product-surface alignment instead of only landing a skeleton.

**Scope**

- `membership`
  - owner / admin / member
  - invite / join / disable / restore / remove
  - organization/workspace/project/group relations
  - member rate / cost
- `catalog`
  - client / project / task / tag
  - private / billable / archived / pinned / rate / currency / estimated_seconds / fixed_fee
  - project users / project groups
  - create / view / update / delete
  - archive / restore
  - pin / unpin
  - templates, stats, periods
- Web
  - organization members page, workspace members page, group management page, project members page
  - rate / cost settings page
  - permission config page
  - complete project / client / task / tag pages, not skeletons

**Recommended parallel streams**

- `membership-core` subagent
- `catalog-core` subagent
- `members-projects-web` subagent

**Dependencies**

- Depends on Wave 1 and Wave 1.5's identity, tenant, session, workspace settings, and UI baseline.

**Exit Criteria**

- The permission model is enforced by data and contract, not only via UI hiding
- Visibility and writability of private projects remain consistent across API, Web, and report-entry pre-checks
- Rate and cost fields have become usable input for tracking / reports
- project / client / task / tag have completed formal product-surface alignment, including CRUD, archive/restore, pin/unpin, templates, and stats/periods
- Rate / cost settings page and permission config page have formal pages, contracts, and test coverage
- Story coverage within Wave 2 scope has been updated in the test story list
- `project page`, `client page`, and member/permission-related formal pages reference PRD/Figma or an explicit fallback skeleton, with alignment results submitted

### Wave 3: Tracking Core Transaction Surface

**Goal**

Build up OpenToggl's main business source of truth, making time entry and running timer the unified foundation for all downstream product surfaces.

**Scope**

- `tracking`
  - time entry CRUD
  - running timer start / stop / conflict handling
  - bulk update
  - filter / since sync
  - timezone / RFC3339 / UTC semantics
  - billable / rate / client / project / task / tag interpretation
- Web
  - timer list
  - timer calendar
  - timer timesheet
  - create/edit timer flows

**Recommended parallel streams**

- `tracking-write-path` subagent
- `tracking-query-path` subagent
- `timer-page-family` subagent

**Dependencies**

- Depends on Wave 2's membership, catalog, workspace settings, rate/cost rules.

**Exit Criteria**

- The same tracking facts drive list, calendar, and timesheet simultaneously
- Running timer conflict rules are fixed with regression protection
- Illegal combinations of `start/stop/duration` return a fixed error
- since sync and main filters are aligned between compat API and Web behavior
- Wave 3's `timer` page family page flow and core e2e have landed per testing-strategy
- The three formal views `calendar`, `list`, `timesheet` reference their corresponding Figma nodes, proving they share the same page-family semantics

### Wave 4: Tracking Extension Surface and Governance

**Goal**

Fill in approvals, expenses, favorites, goals, reminders, timeline, and the cross-rules between tracking and governance.

**Scope**

- `governance`
  - approvals state machine
  - timesheet approval authority
  - audit linkage
- `tracking`
  - expenses state machine, attachment, currency snapshot
  - favorites / goals / reminders / timeline
- Web
  - approvals page
  - expenses page
  - related tracking extension entries

**Recommended parallel streams**

- `approvals-governance` subagent
- `expenses-tracking` subagent
- `low-frequency-tracking-ui` subagent

**Dependencies**

- Strong dependency on Wave 3 tracking source of truth.

**Exit Criteria**

- approval / expense state machines are fixed
- Approval permissions, rules such as rollback-to-`reopened` on edit, are consistent between API and Web
- Attachments, exchange-rate snapshots, and historical result freeze semantics are complete
- Wave 4 coverage status is backfilled into the test story list, with remaining gaps labeled

### Wave 5: Reports Read Model and Sharing

**Goal**

Build an independent reports product surface without redefining tracking semantics.

**Scope**

- `reports`
  - detailed / summary / weekly / trends / profitability / insights
  - saved reports
  - shared reports
  - filters, pagination, sorting, exports
  - report projection and exports
- Web
  - detailed / summary / weekly / trends / profitability / insights
  - save/share/export flows

**Recommended parallel streams**

- `reports-read-model` subagent
- `reports-api-exports` subagent
- `reports-web` subagent

**Dependencies**

- Depends on Wave 2's membership/catalog/rate
- Depends on Wave 3-4's tracking / approvals / expenses

**Exit Criteria**

- Online query, export, saved report, and shared report use the same permission and filter semantics
- Reports and tracking interpret historical facts consistently
- Exchange-rate, rounding, and profitability rules are consistent across shared/export/online
- Reports page family page flow, export golden, and at least one high-value e2e are aligned with stories

### Wave 6: Webhooks Runtime

**Goal**

Implement a complete Webhooks product surface, not just subscription CRUD.

**Scope**

- `webhooks`
  - subscription CRUD
  - filters
  - validate / ping
  - signature
  - delivery records
  - retry / disable / limits / status
  - event exposure pruning on owner/workspace/visibility changes
- Web
  - integrations webhooks page
  - subscriptions, filters, validate/ping, delivery history, failure attempts, limits, status

**Recommended parallel streams**

- `webhooks-core-runtime` subagent
- `webhooks-delivery-status` subagent
- `webhooks-web` subagent

**Dependencies**

- Depends on Wave 2's permission model
- Depends on Wave 3-4's tracking/governance event facts

**Exit Criteria**

- validate/ping and real delivery share the same runtime, but with distinguishable state
- retry / disable / limits / status are formal runtime behavior, not admin scripts
- Private projects and permission changes affect subsequent event exposure
- Webhooks page family, runtime tests, and basic verification e2e are covered by stories
- The `integrations webhooks` page references the Figma node in PRD and submits alignment results

### Wave 7: Billing Commercial Views, Invoices, and Closure

**Goal**

On top of Wave 1's billing core source of truth, fill in commercial views, invoices, customer management, and final product closure.

**Scope**

- `billing`
  - invoice / download
  - customer edit
  - display and management details for plan/subscription/quota
  - invoice list / download
- Web
  - billing / subscription / plans / limits / invoices / customer

**Recommended parallel streams**

- `billing-core-gates` subagent
- `billing-commercial-views` subagent
- `billing-web` subagent

**Dependencies**

- Depends on Wave 1 tenant relations
- Depends on Wave 2 membership seat semantics
- Depends on capability integrations from Wave 5-6 that require quota/gate

**Exit Criteria**

- feature gate and quota source of truth continue to be uniformly provided by billing
- Organization/workspace subscription views do not form two sources of truth
- Self-hosted may use a different underlying billing implementation, but the externally exposed state and object model remain consistent
- Plan downgrade, over-limit, and historical-object retention stories have explicit test mapping and coverage status

### Wave 8: Importing Migration Closed-Loop

**Goal**

Implement `import` as a formal product capability, not a one-off script.

**Scope**

- `importing`
  - import job
  - ID mapping
  - two-phase entity import and time entry import
  - conflict / failure / retry / diagnostics
  - import result API
- OpenAPI
  - `opentoggl-import.openapi.json`
- Web
  - import page
  - import job list
  - conflict/failure diagnostics page
  - retry entry

**Recommended parallel streams**

- `import-engine` subagent
- `import-runtime-diagnostics` subagent
- `import-web` subagent

**Dependencies**

- Depends on Wave 1-4 core entities and tracking source of truth
- Depends on Wave 5 reports readback consistency

**Exit Criteria**

- A minimum Toggl sample can be imported and be readable in main tracking views and the compat API
- ID mapping, failure details, conflict diagnostics, and retryable behavior are complete
- import continuation uses a real job runtime and does not depend on manual supplementary scripts
- import page family, diagnostics page, and "minimum sample import success" e2e are aligned with stories

### Wave 9: Instance Admin / Platform Operations

**Goal**

Fill in the product surface that makes OpenToggl a runnable, governable, maintainable host instance.

**Scope**

- `governance`
  - bootstrap
  - registration policy
  - instance user governance
  - config entry points
  - ops / health / diagnostics
  - security / audit
  - maintenance / read-only / job pause-resume
- OpenAPI
  - `opentoggl-admin.openapi.json`
- Web
  - bootstrap page
  - registration policy page
  - instance-level user governance page
  - instance-level config page (SMTP / storage / payment / SSO / security)
  - health status, system status, security and audit pages
  - maintenance mode / read-only mode / job pause-resume entry

**Recommended parallel streams**

- `admin-bootstrap-governance` subagent
- `admin-ops-health` subagent
- `admin-web` subagent

**Dependencies**

- Depends on Wave 0 platform runtime
- Depends on Wave 1 identity/session
- Depends on async-system state integration from Wave 5/6/8

**Exit Criteria**

- First-admin bootstrap can only succeed once
- Registration policy, instance-level user governance, and instance-level health and maintenance entries all have formal product expressions
- Admins are not a super-backdoor for business objects; high-privilege operations are audited
- Self-hosted first-admin initialization flow and instance-level health page are usable for containerized-deployment smoke test

### Wave 10: Compatibility Closure and Release Preparation

**Goal**

Once all product surfaces exist, do a cross-product-surface behavior closure, without introducing new features.

**Scope**

- Global URL state / query state / session state consistency recheck and remaining gap cleanup
- Shared app shell, navigation, branding, feature gating closure
- Gap fill-in for OpenAPI, golden, page flow, e2e
- Performance budget and full test-suite budget compression
- Recheck of docs, fixtures, seed, and minimum release gate

Note: any structural state issues already identified in P0, Wave 1, or earlier waves should have been remediated in their corresponding earlier waves; Wave 10 is only for final cross-product-surface recheck, gap fill-in, and unified phrasing, and must not defer known high-priority structural drift to this wave.

**Recommended parallel streams**

- `compatibility-gap-closer` subagent
- `frontend-parity-closer` subagent
- `test-budget-hardening` subagent

**Dependencies**

- Depends on all nine preceding waves being complete.

**Exit Criteria**

- Primary PRD user stories each have an explicit acceptance chain
- Compat outputs are locked down by contract or golden
- The full test suite meets budget
- No product surface is left in API-only / Web-only shape
- Page flow and e2e gaps required by `testing-strategy` are zeroed out or explicitly downgraded with approval
- Self-hosted deliverables are complete: image, compose, sample env, migration commands, initialization flow, persistent volume strategy, upgrade/rollback instructions
- A new environment started per the docs can pass `health`, log in, enter a workspace, and complete the minimum critical-path smoke test
- All formal pages that have Figma prototypes in PRD have a submitted `PRD -> Figma node -> implementation page -> test` comparison

## 8. End-to-End Test Matrix

Every wave must map user stories to the following test layers; you may not pick just one layer to count:

- `Domain Unit`
  - Protects invariants, value objects, state machines, and base rules such as rate/time/permission.
- `Application Integration`
  - Protects transaction boundaries, permission rejection, job records, and main query semantics.
- `Transport Contract`
  - Protects paths, parameters, auth entries, error codes, and response shape.
- `Async Runtime`
  - Protects projector, delivery, retry, idempotency, continuation.
- `Frontend Unit`
  - Protects formatters, mappers, URL adapter, form schema adapter.
- `Frontend Feature`
  - Protects a single high-value interaction flow.
- `Frontend Page Flow`
  - Protects routing, search params, page-family composition, and reload/back-forward consistency.
- `E2E`
  - Protects a small number of high-value cross-layer user paths.
- `Compatibility Golden`
  - Locks down Toggl compat outputs and OpenToggl's own formal outputs.

Default acceptance gate:

- Capabilities that have a formal API must have a contract test.
- Capabilities that have Toggl compat output must have a golden.
- Capabilities that have job/projector/delivery must have a runtime test.
- Capabilities that have a formal page family must have a page flow test.
- High-value user paths must have an e2e.

Every wave must also maintain a story coverage list, including at minimum:

- Covered BDD stories and their corresponding test layers
- Not-yet-covered stories
- Explicitly deferred stories and reasons
- Status of page flow / e2e gaps required by `testing-strategy`

## 9. Unified Dependencies

The core dependency graph of the overall plan is:

1. Wave 0 provides the foundational runtime, directories, generation chain, and test skeletons for all subsequent waves.
2. Wave 1 lands identity/session/tenant/billing foundation first, because all workspace-level product surfaces depend on login state, tenant relations, and a real feature gate / quota source of truth.
3. Wave 2 then lands the full membership/catalog product surface, because tracking, reports, and webhooks all depend on permissions, directory objects, and rate/cost rules.
4. Wave 3 first connects the tracking source of truth; Waves 4-6 can then build on top of the same facts.
5. Wave 5 reports and Wave 6 webhooks both depend on Wave 1's billing gate facts and Wave 3-4's tracking/governance results.
6. Wave 7 billing is only responsible for commercial views, invoices, and customer closure; it no longer takes on the gating source-of-truth role of prior waves.
7. Wave 8 import depends on core entities, tracking source of truth, and reports readback closed-loop.
8. Wave 9 instance-admin depends on platform, identity, filestore, and aggregated async-system state.
9. Wave 10 only closes things out and does not introduce a new source of truth.

## 10. Risks and Control Strategy

### 10.1 Biggest Risks

- Premature parallelism causes shared-layer conflicts and slows things down instead.
- Test design derived backwards from OpenAPI, leading to "many endpoints but no user-story acceptance."
- Treating reports, webhooks, and import as CRUD or scripts, bypassing real runtime.
- Web and API each implement their own semantics, leading to compatibility drift.
- Test counts grow out of control and blow past the 30s budget.
- Self-hosted delivery is deferred until the very end, causing a crunch of image, compose, migration, and init issues before release.
- At release time there is only source code and no stable runnable artifacts or smoke gate.

### 10.2 Countermeasures

- Parallelism only happens between tasks with non-overlapping write sets; shared layers are closed first before propagation.
- Every task ticket must state the PRD user story it serves and the test chain.
- All async systems must land via the same job runtime and record mechanism.
- `packages/shared-contracts` only carries public contract types, schema, and generated artifacts; view-model mapping belongs in `entities`, `shared/forms`, `shared/url-state`, or transport adapter; pages must not connect directly to backend DTOs.
- At the end of each wave, run a test-budget check; don't leave timeout problems until the end.
- Maintain the containerized delivery chain from Wave 0 onward; run `compose + smoke` in each relevant wave, not leaving deployment issues until Wave 10.
- Release preparation must produce image, compose, sample env, migration and initialization steps, not only "how to start local source."

## 11. Completion Definition

This plan is complete only when all of the following are satisfied:

- All formal product surfaces already have complete expression in both API and Web.
- `Track API v9`, `Reports API v3`, and `Webhooks API v1` have been verified with a chain of contract + golden + user stories.
- `import` and `instance-admin` have launched as formal product surfaces, not scripts or manual procedures.
- Web page families remain consistent with Figma/screenshot semantics, without unilaterally rewriting product semantics.
- All high-value user stories have at least one end-to-end test chain.
- Promised stories in `docs/testing/bdd-user-stories.md` are either covered, explicitly deferred with approval, or formally removed.
- Frontend and backend have formal production builds and container images; self-hosted can start via `docker compose`; local development still runs frontend/backend source processes by default.
- A new environment, after migration and initialization per the docs, can complete health check, login, entering a workspace, and the minimum critical-path smoke test.
- The full test suite can run quickly locally and stay within budget.
- Remaining issues are limited to documented, accepted gaps that do not violate the public contract.

## 12. Execution Notes

When executing this plan, the main agent should default to subagent-driven-development:

- Break tasks into packets by wave, rather than dumping an entire product surface into a single agent at once.
- At any one time, only let subagents handle tasks that are explicit, clearly bounded, and non-conflicting in write sets.
- After each task, go through spec review, then quality review, before moving to the next task.
- Do not let the subagent re-read the entire plan itself; the orchestrator supplies the minimum context needed for the task.

This document is a complete implementation blueprint, not an item-by-item checklist for construction. In actual execution, break this plan into smaller task packets by wave and hand them to subagents.
