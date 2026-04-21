# OpenToggl Codebase Structure and Dependency Rules

This document is the index and top-level rulebook for the `OpenToggl` implementation structure, and is not responsible for carrying every detail.

It answers three things:

- Which documents define the frontend, backend, and testing rules respectively
- Which conclusions are the SSOT of the current code structure
- Which unidirectional dependency and boundary rules new directories, modules, and interfaces must follow

If you need details sufficient to directly guide implementation and code review, continue reading:

- [frontend-architecture](./frontend-architecture.md)
- [backend-architecture](./backend-architecture.md)
- [testing-strategy](./testing-strategy.md)

## 1. Responsibility of This Document

`codebase-structure.md` only does the following:

- Defines the top-level repository structure and business context boundaries
- Defines the authority relationships among documents
- Defines the top-level rules for unidirectional dependencies, SSOT, cross-module collaboration, async boundaries, etc.
- Acts as the entry index for the frontend, backend, and testing structure documents

This document no longer expands to repeat:

- Frontend state management and component layering details
- Backend command/query, composition, job/projector details
- Testing matrix, testing directories, acceptance layering details

Those are governed by their corresponding topic documents.

## 2. Document Authority Relationships

When conflicts arise, interpret in this order:

1. `docs/core/product-definition.md` and the corresponding `docs/product/*.md`
2. `openapi/*.json` and Figma
3. `docs/core/domain-model.md`
4. `docs/core/architecture-overview.md`
5. This document and the corresponding frontend / backend / testing topic documents
6. `docs/challenges/*`

Interpretation rules:

- `product/` decides user-visible behavior and page semantics.
- `openapi/` is the direct input source for the API boundary; Figma is the direct input source for the UI boundary.
- `domain-model` decides the domain boundary, object ownership, aggregate roots, and key invariants.
- `core/architecture-overview.md` decides the system-level process and deployment blueprint.
- This document and its sub-documents decide how the code is organized, how it depends, and how it is tested.
- `challenges/` is not a current authoritative definition.

## 3. Structure SSOT

For "how the code should be organized", the current SSOT is:

- Top-level business contexts and dependency direction: this document
- Frontend page, state, component, shared-package boundaries: [frontend-architecture](./frontend-architecture.md)
- Backend module, layering, use case, query, composition-layer boundaries: [backend-architecture](./backend-architecture.md)
- Testing layering, directories, coverage requirements: [testing-strategy](./testing-strategy.md)

It is forbidden to invent implementation structure in `product/` documents.
It is forbidden to hand-write an external public API field source of truth anywhere other than `openapi/`.

## 3.1 Single Entry Commands and Target Structure

The document must write out the default commands directly, rather than use the term "runtime" as a vague catch-all.

The single default entry points are:

```bash
# source-based local development
vp run website#dev
air

# schema workflow
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql

# self-hosted smoke / release-style verification
docker compose up -d postgres redis
docker compose up -d --build opentoggl
```

The target structure is also fixed as:

```text
apps/
  website/
    src/
      app/
      routes/
      pages/
      features/
      entities/
      shared/
  backend/
    main.go
    internal/
      bootstrap/
      http/
      web/
      <business contexts>/
      platform/
        schema/

packages/
  web-ui/
  shared-contracts/
  utils/
```

## 3.2 Local Development Entry Point and Repo-Root Constraints

- Local development entry points are consistently triggered from the repo root.
- The frontend local development entry point is `vp run website#dev` executed at the repo root.
- The backend local development entry point is `air` executed at the repo root.
- The root-level configuration file of `air` is fixed as the repo root `.air.toml`, whose build/run target points at `./apps/backend`; no second hot-reload entry point or parallel configuration may be maintained under `apps/backend`.
- Local development environment variables are consolidated at the repo root — required env must not be scattered into `apps/website`, `apps/backend`, or root-level shell wrapper scripts.
- Local dev env conventions are consolidated at the repo root: `.env.example` is the template, `.env.local` is the machine-local runtime file.
- The repo-root `.env.local` is a required prerequisite for source-based local development; `.env.example` is only a template, not a startup input that can be treated as "already configured".
- Backend source startup must obtain real datasource configuration explicitly via env by default; when the datasource env is missing, startup must fail immediately — backfilling a working default database address is not allowed.
- Backend connection-type and listening-type env use standard names: `PORT`, `DATABASE_URL`, `REDIS_URL`. No parallel names such as `*_DATABASE_DSN`, `*_REDIS_ADDRESS`, `*_LISTEN_ADDRESS` may be invented for the default dev/startup path.
- PostgreSQL schema management is fixed as `pgschema`. That workflow is allowed to take standard PostgreSQL CLI env variables `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE` as `pgschema` input; they only serve schema tooling and do not replace the `DATABASE_URL` used by application startup.
- `PORT` expresses only the listening port — it does not carry the semantics of "which host to bind to"; the backend consistently listens on `0.0.0.0:<PORT>`.
- The default local development runtime path must connect to real PostgreSQL / Redis and other dependencies; in-memory stores, placeholder backend paths, fake state, or "temporary defaults" are not allowed as the normal source-based dev backend.
- New root-level `scripts/*.sh` must not be added as local development startup, proxy, or composition entry points.
- The `scripts/` directory does not carry day-to-day local development responsibilities; if a new source-dev entry point is needed, consolidate it into the root toolchain or a formal CLI first.
- `docker compose` only describes the self-hosted delivery chain; it is not the default local development flow.
- The self-hosted delivery chain should directly use `docker compose` as the canonical entry point — no secondary wrapping as `pnpm`, a Node CLI, or any other two-level entry point.

## 3.3 Structural Priority

- Structural consolidation, technical debt remediation, and simplification of startup entry points take priority over continuing to expand the product feature surface.
- If the directory structure, startup commands, self-hosted delivery shape, or doc wording are still drifting, do not continue to pile more formal functionality on top.
- When structural remediation conflicts with feature development, complete the structural remediation first, then continue the next wave of feature implementation.

## 3.4 Names Must Express Long-Term Responsibility, Not Execution Phase

- Names retained long-term may only express: responsibility, product surface, module boundary, entity/action semantics, startup/host boundary, contract boundary.
- Code identifiers, file names, directory names, generated artifact names, script names, test suite names, and public contract labels must by default land in the above naming set.
- Planning phases, execution order, delivery batches, temporary states, and transition states do not belong in the semantic set allowed for long-term implementation naming.
- If an implementation is still on a transition path, it must still be named by responsibility; "it's still a transition implementation right now" may only be recorded in the plan, debt, historical archive, or an explicit comment, with an exit condition.
- The generation chain follows the same allowlist: generation scripts, generated files, handler interfaces, adapters, fixtures, and test names must all express capabilities or contract boundaries.
- Only plan documents, historical archives, migration notes, and explicit debt records may retain phase terms; those terms are not part of formal implementation naming.
- Counter-example quick check: if a name contains words like `wave`, `phase`, `milestone`, `slice`, `temporary`, `transition`, `current`, `tracer`, `spike`, `compat`, suspect by default that it expresses an execution phase, a fuzzy migration boundary, or a transition state rather than long-term responsibility — and either demand a reason for retention or rename it.
- During review, if a name expresses execution phase rather than long-term responsibility, treat it directly as structural drift.

## 3.5 OpenAPI Source Layering

Existing external public API OpenAPI sources:

- `toggl-track-api-v9.swagger.json`
- `toggl-reports-v3.swagger.json`
- `toggl-webhooks-v1.swagger.json`

OpenToggl custom sources to be added later:

- `opentoggl-web.openapi.json`
- `opentoggl-import.openapi.json`
- `opentoggl-admin.openapi.json`

Rules:

- `toggl-*` only carries external public API definitions
- `opentoggl-web` carries the Web frontend's own backend interfaces
- `opentoggl-import` carries the import product surface
- `opentoggl-admin` carries instance management and governance capabilities
- Custom interfaces must not be mixed into `toggl-*`

## 4. Top-Level Repository Structure

The target-state repository structure is:

```text
apps/
  website/
  backend/
    main.go
    internal/
      bootstrap/
      http/
      web/
      identity/
      tenant/
      membership/
      catalog/
      tracking/
      governance/
      instance-admin/
      reports/
      webhooks/
      billing/
      importing/
      platform/
        schema/

packages/
  web-ui/
  shared-contracts/
  utils/
```

Notes:

- `apps/website` is the current Web product application.
- `apps/backend` is the Go backend application; `main.go` is the sole process entry point, and `internal/*` simultaneously carries bootstrap, the composition layer, and the business modules.
- `apps/backend` only maintains Go process code, embedded static placeholder assets, and Go tests; no `package.json`, `tsconfig`, `vite/vitest` or frontend test harness should be maintained in that directory.
- `apps/backend/internal/platform/schema/` is the single home directory for the PostgreSQL desired-state schema, managed by `pgschema` plan/apply; no parallel schema source of truth may be maintained elsewhere.
- `packages/` only holds code shared across applications that does not own business processes.
- The backend business modules live in `apps/backend/internal/*`; no additional top-level `backend/` directory is split out.

The frontend's `packages/web-ui` is not optional — it is the application-level UI baseline package:

- `apps/website/src` owns product pages, feature and entity components
- `packages/web-ui` owns `baseui`-based themes, tokens, overrides, and thin wrappers
- `packages/web-ui` must not degrade into a new business-component directory

The current repo is still at the starter stage; the existing `apps/website` is just the scaffolding entry point.
Before a formal frontend refactor, treat `apps/website` as the current source of truth; the target structure is only guidance for subsequent evolution.

## 5. Top-Level Business Contexts

The backend business contexts are split into the following fixed modules:

- `identity`: accounts, login state, API tokens, current user
- `tenant`: organization, workspace, core settings and ownership
- `membership`: membership relations, roles, groups, project member visibility
- `catalog`: client, project, task, tag and other catalog objects
- `tracking`: time entry, running timer, expense
- `governance`: approval, timesheet, audit, API quota
- `instance-admin`: bootstrap, registration policy, instance-level user governance, instance configuration, maintenance mode, platform health and diagnostics
- `reports`: report read model, exports, saved/shared reports
- `webhooks`: subscriptions, delivery, retries, delivery health
- `billing`: plan, subscription, invoice, customer, commercial quota
- `importing`: import, ID preservation, conflicts, audit, retries
- `platform`: database, auth, filestore, jobs, observability and other technical substrate
- `platform/schema`: PostgreSQL schema desired state, blob/job/bootstrap shared infrastructure table definitions, and the schema management boundary that interfaces with `pgschema`

The refinement and template of module responsibilities is governed by [backend-architecture](./backend-architecture.md).

## 6. Unidirectional Dependencies

The only allowed main direction:

```text
web page -> feature -> entity/shared
transport -> application -> domain
infra ----> application / domain
all modules -> platform
```

Explicitly forbidden:

- `platform -> business module`
- `domain -> transport`
- `domain -> SQL / Redis / HTTP client`
- `page -> raw backend DTO`
- Any lateral coupling of `feature A -> feature B`
- `module A/infra -> module B/infra`

Allowed:

- Frontend `page` assembles multiple `feature`s and `entity`s
- Frontend `feature` depends on `entity` and `shared/*`
- Backend `application` of one module depends on another module's `application` via an explicit interface
- `reports` reads projection results of other contexts via read models and query ports

## 7. Single Source of Truth

Three kinds of sources of truth must be clearly distinguished:

- Product source of truth: `product/` documents define user-visible behavior
- API/UI strong-constraint sources: `openapi/*.json` and Figma
- Data source of truth: the transactional write model is governed by PostgreSQL; the report read model is governed by `reports` projections
- PostgreSQL structure source of truth: the `pgschema` desired-state SQL in the repo is authoritative; the live database is just that source of truth's landing result at a given moment

Frontend state also must have a source-of-truth split:

- Server state follows backend responses and the query cache
- URL state follows route params and search params
- Form drafts follow the form state
- Temporary UI state only exists in the local component tree

Detailed rules are in [frontend-architecture](./frontend-architecture.md).

## 8. Synchronous and Asynchronous Boundaries

Must be completed in the same transaction:

- Main business write
- The minimum state change required for permission decisions
- audit record
- The `job record` required for subsequent async processing

Must be processed asynchronously:

- reports projection
- webhook dispatch
- export generation
- import continuation
- notification / cleanup / maintenance

Detailed rules are in [backend-architecture](./backend-architecture.md).

## 9. Where New Code Goes

Judgment rules:

- If it is a new user action flow, put it in the frontend `features/` first
- If it is a new page assembly or route family, put it in the frontend `pages/` and `routes/`
- If it is a new presentation and mapping of a domain object, put it in the frontend `entities/`
- If it is a new transactional business capability, put it in the corresponding backend module's `application/`
- If it is a new entity, invariant, or value object, put it in the corresponding backend module's `domain/`
- If it is a new database/cache/third-party implementation, put it in the corresponding backend module's `infra/` or `platform/`
- If it is a new PostgreSQL table, index, constraint, trigger, RLS policy, or platform-shared table definition, first determine ownership, then aggregate it via `platform/schema/` into the `pgschema` desired-state SQL — do not change the live database directly
- If it is a new HTTP entry point, it may only live in `transport/http/*` or `apps/backend/internal/http` / `apps/backend/internal/web`
- If it is a new cross-product testing requirement, put it in the location specified by [testing-strategy](./testing-strategy.md)

## 10. Code Review Checklist

When doing structure-related review, check at minimum:

- Whether user-visible rules were written into `product/`, not hidden only in code
- Whether the external public API explicitly uses `openapi/*.json` as its input source
- Whether the unidirectional dependency rule is respected, without sneaking through `platform` or cross-module `infra`
- Whether server state, URL state, and local UI state are mixed together
- Whether pages directly swallow raw DTOs without going through entity/view model mapping
- Whether `reports` is allowed to depend long-term on online scans of OLTP
- Whether side effects that should be async are being done on the main request
- Whether tests at the corresponding layers have been added for the new capability

## 11. Relationship to Other Documents

- `docs/core/architecture-overview.md`: defines the system-level process and deployment blueprint
- [frontend-architecture](./frontend-architecture.md): defines frontend state, page, component, and shared-package rules
- [backend-architecture](./backend-architecture.md): defines the internal structure, collaboration and composition rules of backend modules
- [testing-strategy](./testing-strategy.md): defines the testing matrix, directories, and acceptance boundaries
- `docs/core/domain-model.md`: defines the confirmed domain model and implementation boundary constraints for OpenToggl

This document is the entry point, not a black hole of details.
