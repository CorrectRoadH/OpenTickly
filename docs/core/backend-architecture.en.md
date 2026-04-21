# OpenToggl Backend Architecture

This document defines how the backend modules land inside the monolith, focusing on answering:

- How each business module is organized internally
- How command / query / transport / composition are split
- Where transactions, permissions, async jobs, projectors and delivery execution chains live
- How modules collaborate across boundaries, and which dependencies are not allowed

The system-level blueprint is governed by `docs/core/architecture-overview.md`; this document is responsible for landing it into the code structure.

This document strongly depends on the following upstream definitions:

- `docs/core/product-definition.md`
- The corresponding `docs/product/*.md`
- `docs/core/domain-model.md`
- `docs/core/architecture-overview.md`

Constraints:

- This document can only translate those upstream definitions into code structure, module collaboration and startup/assembly rules.
- This document must not retroactively invent or rewrite domain boundaries, object ownership, aggregate roots or key invariants.

## 0.1 Terminology Consolidation

This document consistently uses the following terms:

- Process boundary: `apps/backend` as the Go process entry point and host
- Startup inputs: `PORT`, `DATABASE_URL`, `REDIS_URL`
- Assembly boundary: wiring owned by `bootstrap` / `http` / `platform`
- Async execution chain: job runner, projector, webhook delivery, import continuation
- Real startup verification: process start, schema alignment, dependency connectivity, `/readyz`

Unless referring to existing code identifiers or third-party library names, this document no longer uses `runtime` as a generic umbrella term.

## 0. Source and Applicable Scope of OpenAPI

The repository currently contains 3 OpenAPI sources:

- `openapi/toggl-track-api-v9.swagger.json`
- `openapi/toggl-reports-v3.swagger.json`
- `openapi/toggl-webhooks-v1.swagger.json`

They correspond respectively to the public API surfaces of Toggl:

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`

In addition, the project should later add 3 more OpenAPI files for OpenToggl's custom capabilities:

- `openapi/opentoggl-web.openapi.json`
- `openapi/opentoggl-import.openapi.json`
- `openapi/opentoggl-admin.openapi.json`

Responsibility split:

- `toggl-*`: source for the external public contract
- `opentoggl-web`: the Web frontend's own backend interfaces
- `opentoggl-import`: the import product surface and job orchestration interfaces
- `opentoggl-admin`: instance management, governance, and operational interfaces

Rules:

- `transport/http/public-api` only consumes `toggl-*`
- `transport/http/web` only consumes `opentoggl-web`, `opentoggl-import`, `opentoggl-admin`
- OpenToggl custom management interfaces must not be mixed into `toggl-*`, the external public contract source
- Import APIs must not be stuffed into admin, unless only the underlying use case is reused rather than the public contract

The backend must not "generate architecture from OpenAPI", but must "generate boundary requirements from OpenAPI".

For all OpenAPI sources, `openapi/*.json` is the input source for:

- transport DTO
- handler / route stub
- Parameter validation requirements
- request validation smoke / response shape smoke requirements
- Endpoint-to-module / use case mapping list

`apps/backend` is a pure Go process boundary:

- Do not maintain standalone `package.json`, `tsconfig`, `vite/vitest` or TypeScript contract/golden harness under `apps/backend`
- OpenAPI contract evidence preferentially lands in Go transport / bootstrap tests, and in the frontend or shared-package tests that actually consume the contracts

`openapi/*.json` is NOT a direct source for:

- domain models
- command / query partitioning
- transaction boundaries
- permission rules
- job / projector / delivery execution chain design

Therefore the flow is fixed as:

1. Generate transport / contract requirements from OpenAPI
2. Humans map endpoints to modules and use cases
3. The implementation layer decides how domain, application, and infra collaborate

Fixed landing rules for each layer:

- OpenAPI generated request/response types belong only to the `transport` contract boundary
- `transport` maps generated types to `application` command / query input
- `application` returns command results, query views, snapshots, or other application-layer results
- `transport` then maps those application-layer results back to generated response types
- `domain` only carries entities / value objects / domain services with real business invariants, and does not carry the public API shape

Two common forms of drift are forbidden:

- Letting `application service` directly receive or return OpenAPI generated types
- Wrapping everything into so-called "domain objects" because you don't want to write a mapper, mixing query views, page composition results and contract shapes into `domain`

Additional naming constraints:

- Transport, generation scripts, generated files, adapters, handler interfaces, host/bootstrap assembly files and test files may only be named after the product surface, capability domain, or contract boundary.
- Insufficient coverage, an implementation still in transition, or a capability that hasn't yet been fully taken over must all be tracked in plan/debt, not written into code names.

## 0.5 Backend Tech Stack and Framework Decisions

The backend document must be explicit down to concrete engineering decisions, not stay at abstract layering.

The current target-state decisions are:

- HTTP host framework: `echo`
- External public API routes and handler interfaces driven by `toggl-*` OpenAPI: fully generated from the OpenAPI using `oapi-codegen`
- External public API request/response validation driven by `toggl-*` OpenAPI: driven by the OpenAPI generation chain and `kin-openapi`
- Web/internal API host: may continue to be mounted on the same `echo` instance, but must not pollute the `transport/http/public-api` boundary in reverse
- OpenAPI code generation: `oapi-codegen`, with the external public API transport as the highest-priority generation target
- Database: `PostgreSQL`
- Database access: `pgx`
- PostgreSQL schema management: `pgschema` (declarative desired-state SQL + `plan/apply` workflow)
- Transactions: explicit `pgx.Tx`
- Redis: the official Redis client, with the connection and minimal wrapper provided by `platform`
- Dependency injection: hand-written constructor wiring — no container-style DI, no code-generation DI
- Background job runner: in-process runner + PostgreSQL job record

Rationale:

- The main risk for the external public API is not "picking the wrong framework", but hand-writing routes, parameter binding, validation and response shapes and gradually drifting away from the OpenAPI.
- Therefore the external public API uses generation-first: OpenAPI determines routes, parameters, DTOs, handler interfaces, validators and the contract skeleton; humans no longer hand-write these boundaries.
- Under that premise, the value of `echo` is to be a mature transport host carrying generated artifacts, not to carry business semantics.
- `echo` may only live in `transport` and `apps/backend/internal/http`; `application`, `domain` and `infra` must not depend on `echo.Context` or any `echo` type.
- DI explicitly uses hand-written assembly — not `fx`, `wire`, `dig` and similar containers or generators; what this project needs is a clear dependency graph, reviewable startup ordering, and explicit module boundaries, not extra framework semantics.
- OpenAPI still only generates the transport/contract boundary; it does not generate domain/application/infra.

## 0.5.1 PostgreSQL Schema SSOT and the `pgschema` Workflow

PostgreSQL schema management must be a single path.

Fixed decisions:

- The single source of truth for the PostgreSQL schema is the version-controlled `pgschema` desired-state SQL in the repo.
- `pgschema` is the only allowed formal schema manager; no second parallel long-term migration numbering system, ORM auto-migrate, or ad hoc DDL workflow is maintained.
- `pgschema dump` is only used for importing current state, debugging or incident analysis — it is not the source of truth for daily changes.
- The daily schema change workflow is fixed as: modify desired-state SQL -> `pgschema plan` -> review plan output -> `pgschema apply`.
- `pgschema plan` output is part of code review and deployment review evidence; hand-written DDL directly on the database, skipping plan, is not allowed.
- `pgschema apply` may be used in local development, self-hosted deployment and CD, but all must take the same desired-state SQL from the repo as input.

Recommended directory ownership:

```text
apps/backend/internal/platform/
  schema/
    schema.sql
    blobs.sql
    jobs.sql
    bootstrap.sql
    .pgschemaignore
```

Rules:

- `platform/schema/` owns PostgreSQL structure definitions and does not carry business command/query logic.
- Schema files may be split by object family, but combined must still express the complete desired state.
- Blobs, job records, bootstrap guards, platform-level metadata and other shared infrastructure tables belong to `platform/schema/`.
- Concrete business tables will later be maintained by each module's ownership, but still aggregated into the same desired state via `pgschema`.
- No module may sneak in a second schema entry point internally, such as `gorm.AutoMigrate()`, ad-hoc in-process `CREATE TABLE`, or an independent migration CLI that bypasses `pgschema`.

Environment conventions:

- The application startup path continues to use `DATABASE_URL` as the main DSN input for the Go backend.
- `pgschema` commands use the standard PostgreSQL CLI environment: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`.
- If the repo-root `.env.local` provides both the application startup env and the PG\* env required by `pgschema`, they must point to the same database instance — two database targets are not allowed.

Workflow conventions:

- Local development: after modifying schema SQL, first run `pgschema plan`, confirm the plan is correct, then run `pgschema apply`, finally start or restart `air` to do real startup verification.
- CI: for schema-related changes, run `pgschema plan` at least once and use the plan output as review evidence.
- CD / self-hosted: the deployment flow runs `pgschema apply --auto-approve` or an equivalent controlled apply step before the application is externally ready; the current self-hosted container image completes this via the entrypoint before starting the HTTP server.
- Rollback: prefer rolling back the desired-state SQL via Git and re-running `pgschema plan/apply`; if the change involves an irreversible destructive DDL, flag it during review and draft a data recovery plan in advance.

## 0.6 Why Hand-Written DI

The goal of dependency injection in this project is not "configurability", but:

- Let `application` swap ports directly in tests
- Let `transport` be mounted into a test server separately without starting the whole site
- Let `apps/backend/internal/bootstrap` be the single source of truth for assembly
- Let reviewers see at a glance which modules an endpoint traverses
- Keep the side-effectful steps in the startup order explicit and readable: `connect postgres/redis -> pgschema reconcile -> bootstrap/init guard -> build services -> start http`

Therefore the reason we don't adopt `fx` is not "it's bad" — it's that the main problems it solves don't match this project's current constraints.

For this project, the main issues with `fx` / `dig` / `wire` are:

- They hide part of the dependency relationships in the provider graph, annotations or lifecycle hooks, weakening `bootstrap`'s readability as the assembly SSOT
- They easily conflate "injectable" with "should depend on", loosening module boundaries and increasing opportunities for cross-context coupling
- They mix startup ordering and object construction; this project specifically requires side-effect steps such as schema apply, bootstrap guard, readiness gate to stay in explicit order
- They make it harder during code review to directly answer "which repo/query service/job runner does this endpoint traverse?"
- For the module scale at the current stage, the complexity cost of introducing container semantics outweighs the benefit

Specifically `fx`:

- `fx` is more suitable for large services that need lots of pluggable providers, complex module lifecycles, and long-term container-style assembly conventions
- The current repo needs explicit, stable, line-by-line reviewable construction order, not a container-style DI that "derives a graph" for us
- If we really end up with dozens of independent modules, multiple independent startup profiles and repeated lifecycle orchestration pain, it's fine to re-evaluate; but that must be an explicit architectural decision, not an early intro just to save a few lines of wiring code

Conclusion:

- `fx` is not a banned topic, but it is not the recommended choice for the current repo
- The current formal path is fixed as: explicit constructors + hand-written bootstrap wiring
- Unless we first update the architecture doc and explicitly explain why hand-written assembly no longer meets the need, we do not introduce `fx`, `dig`, `wire` or similar containers

Therefore the rules are fixed as:

- Each `application` use case receives its dependencies through an explicit constructor
- `application` only depends on the ports, clocks, idempotency, authz/query interfaces it declares itself
- `infra` implements ports but must not hold a reverse service locator
- `apps/backend/internal/bootstrap` is responsible for creating database connections, Redis connections, repos, query services, job runners and handlers
- `apps/backend/internal/bootstrap` is responsible for consuming, outside of the controlled self-hosted / deployment flow, the result of an already-completed `pgschema` run; local `air` source startup must not implicitly run schema reconcile / apply inside the process, while the self-hosted container image is allowed to execute one controlled `pgschema apply` via the entrypoint before `bootstrap.NewAppFromEnvironment`
- `transport/http/*` only receives already-constructed use cases / query handlers / auth context decoders
- Repositories may not be `new`-ed on the fly inside handlers
- Global singletons may not be read inside `domain` or `application`
- Source-based local development must by default supply the critical database/cache configuration through the root `.env.local`; when a critical env is missing, `bootstrap` must fail, and it is not permitted to fake working defaults
- `apps/backend/internal/bootstrap` must treat real Postgres / Redis connection failures as startup failures; it must not treat in-memory stores, placeholder backend paths, or fake dependencies as the default assembly path

Recommended assembly shape:

```text
apps/backend/internal/bootstrap/
  config.go
  database.go
  redis.go
  modules.go
  http.go
  public_api.go

bootstrap.NewApp(cfg)
-> open postgres / redis
-> consume database state already reconciled via external pgschema workflow
-> build platform services
-> build module infra adapters
-> build module application services
-> bind generated public API server implementations
-> register generated public API routes into Echo
-> return app host
```

This assembly style directly serves the testing strategy:

- Domain tests don't need bootstrap
- Application integration tests only construct the current module + real database dependencies
- HTTP infrastructure tests only verify request id, readiness, error logging and other platform capabilities, and do not carry assertions about business interface behavior
- Job tests can start the runner and handler separately, without starting the whole site

### 0.6.2 schema / init / readiness Ordering

The formal startup order in this project is fixed as:

1. Read the root `.env.local` or deployment environment variables
2. Establish real Postgres / Redis connections
3. Verify that the database schema has been aligned with the repo's desired state; local `air` source startup must not implicitly run `pgschema reconcile/apply` in-process
4. Run instance-level initialization and bootstrap guard
5. Build platform services, module infra, application and transport
6. Start the HTTP host
7. `/readyz` returns ready only after schema precheck, initialization and dependency checks all complete

Rules:

- Schema apply must not be deferred and lazily executed on the first request.
- Normal request paths must not implicitly create tables, indexes, triggers or extensions.
- `readyz` must not return success before schema is consolidated and bootstrap checks are complete.
- `healthz` may only indicate process liveness; `readyz` must indicate "real dependencies available and schema/init completed".

### 0.6.1 Transport Layer Code Smells and Forbidden Items

The `transport` layer most easily absorbs application / domain responsibilities when someone rushes to "get the interface running".

This project treats the following cases as clear code smells, not engineering compromises to be kept long-term:

- `transport/http/*` holding business in-memory state, pseudo-repositories, business collections or business state machines
- Handlers directly maintaining user / workspace / project / timer business facts in the transport layer
- Handlers assembling cross-request shared mutable business state in the transport layer instead of calling application services
- Hard-coding authorization, quota, domain rules or error semantics directly in the route shell for "temporary" expedience
- After the OpenAPI contract exists, still hand-writing DTOs, route tables, bind/validate entries and treating them as the formal boundary
- Substituting in-memory state, pseudo-repositories or placeholder backend paths for real Postgres / Redis dependencies on the default local source startup path
- Giving transport/host/adapter/test names that express phase semantics with no long-term responsibility, and then keeping those names as long-term implementation boundaries

Temporary transitional implementations are only allowed if:

- They are explicitly flagged as transitional in the task packet
- They have explicitly written exit conditions, replacement targets and owning wave
- Transitional tests or placeholder backend narratives are not treated as formal completion evidence

The following signals mean structural remediation must come first rather than piling more features on top:

- Handler files keep growing and simultaneously carry decode, business rules, state management and response mapping
- Transport tests mainly verify pseudo-state rather than OpenAPI / public contract / application orchestration
- New endpoints hook into an in-transport fake host / fake backend to reuse "ready-made state", instead of hooking into the corresponding module

## 0.7 OpenAPI Generation and Public Contract Workflow

OpenAPI-related work must clearly separate 4 things:

1. Who owns the public contract source of truth
2. Which mechanical artifacts to generate
3. Which logic must be hand-written
4. How to prove the implementation has not drifted from the contract

The flow is fixed as:

1. Update `openapi/*.json`
2. Use `oapi-codegen` to generate DTOs, parameter types, server interfaces, Echo routes and validator glue for any formal API boundary
3. Use `kin-openapi` to generate or drive the request/response contract skeleton
4. Humans maintain the endpoint -> module -> use case mapping
5. Humans only implement the transport adapter, application calls, and error mapping behind the generated server interface
6. Use contract tests + golden tests to prove the implementation matches the OpenAPI

Generated artifacts are only allowed in the following boundaries:

- `transport/http/public-api/*`
- `transport/http/web/*`
- schema/type artifacts for the frontend or tools in `packages/shared-contracts/`

Generated results may not spread directly into:

- `domain/`
- `application/commands`
- `application/queries`
- `infra/`
- `platform/`

Public contract rules:

- After `toggl-*` OpenAPI updates, update the corresponding contract test first, then change the implementation
- The routes, binding, validation, and handler interface for any formal API boundary must be provided by the generation chain — no fallback to hand-written endpoint shells
- Request validation for any formal API handler follows the corresponding OpenAPI; handlers must not invent an additional set of field semantics
- Response field names, nullability, and error bodies for any formal API follow the corresponding OpenAPI and the necessary golden samples
- `toggl-*` and `opentoggl-*` use the same generation-first path — the only difference is the contract source file

For any formal API boundary that already has an OpenAPI source, the following cases are always drift:

- Continuing to add hand-written route tables instead of going through generated registration
- Continuing to add hand-written request/response DTOs, causing duplicate maintenance alongside the OpenAPI
- Adding another set of independent field validation or field-semantics interpretation inside the handler
- Long-term skipping generation-first boundary consolidation for the reason "it's just a web/internal API for now"
- Building another TypeScript/Vitest contract or golden harness inside `apps/backend`

### 0.7.1 Generation Boundaries for Formal APIs

Any formal API must achieve "architecture generated from the contract", specifically meaning:

- endpoint path / method generation
- path/query/header/body parameter type generation
- request decode / bind generation
- request validation generation
- handler interface generation
- route registration generation
- contract test skeleton generation

The parts retained for humans are only:

- Implementation of the generated server interface
- transport public error mapping
- Explicit mapping between generated DTOs and application types
- application command/query calls
- Endpoint-to-module/use case ownership list

Humans may not hand-write the following formal API structures:

- route table
- request DTO
- response DTO
- handler method signature
- parameter validation entry

The reason is simple:

- The primary goal of the formal API is "evolve with the OpenAPI", not "be comfortable to hand-write"
- As long as the endpoint shell allows hand-writing, shape drift, missing fields, missed validation and drifted error codes will eventually appear
- generation-first is more reliable than code review because it eliminates the mutable surface first

## 1. Target Directory

```text
apps/backend/
  main.go
  internal/
    bootstrap/
    http/
    web/
    <context>/
      domain/
      application/
      infra/
      transport/
        http/
          public-api/
          web/
```

Notes:

- `apps/backend` is the backend application directory; `main.go` is the sole process entry point.
- `apps/backend/internal/<context>` is the main body of a business module.
- Business rules do not go into `main.go`; composition, assembly and business modules are all consolidated in `apps/backend/internal/*`.

## 2. Module Template

Every business module uses the template below:

```text
apps/backend/internal/tracking/
  domain/
    time_entry.go
    timer_policy.go
    value_objects.go
    errors.go
  application/
    commands/
      start_time_entry.go
      stop_time_entry.go
    queries/
      list_time_entries.go
      get_running_timer.go
    ports.go
    permissions.go
  infra/
    pg/
      time_entry_repo.go
      time_entry_queries.go
    redis/
    providers/
  transport/
    http/
      public-api/
        time_entries.go
        dto.go
      web/
        timer_page.go
        dto.go
```

Rules:

- `domain` holds the business essence
- `application/commands` holds transactional use cases
- `application/queries` holds lists, projections, and aggregated reads
- `infra` holds technical implementations of ports
- `transport/http/public-api` holds the external public API driven by `toggl-*` OpenAPI
- `transport/http/web` holds the Web admin interfaces

If a module is still small, `commands/` and `queries/` may stay without sub-directories, but the command vs query distinction must still be maintained semantically.

## 3. What Belongs in Each Layer

### 3.1 `domain`

Only holds:

- entity
- value object
- invariant
- domain service
- domain error

Does not hold:

- SQL
- HTTP DTOs
- OpenAPI generated types
- application snapshots / query views / page composition results
- auth context parsing
- provider SDKs
- cross-module orchestration

Additional rules:

- The criterion for being a domain object is "does it carry business invariants and domain semantics?", not "will this structure be reused later?"
- Pure query results, list items, aggregated read models, and page assembly results are not domain objects by default
- Do not promote transport DTOs or query results into domain just to avoid writing a mapper

### 3.2 `application`

Responsible for:

- command / query use cases
- main transaction boundary
- authorization and feature gate checks
- calling repository / query ports
- registering audit and job records inside the same transaction
- returning results to transport or composition layer

Rules:

- commands handle the write model
- queries handle read models or projection views
- `application` input/output must use its own command, query, result, view, snapshot or port semantics — do not directly expose OpenAPI generated types
- `application` may return strongly-typed query views / snapshots; these types are not automatically domain objects just because they are serializable
- Do not assemble HTTP responses directly in `application`
- Do not write complex SQL directly in `application`

### 3.3 `infra`

Responsible for:

- Postgres repository / query service
- Redis adapter
- file store adapter
- Third-party provider adapters
- projector / dispatcher execution implementation

Rules:

- `infra` implements the ports defined by `application`
- One module's `infra` must not import another module's `infra`
- projector / delivery execution belongs to the corresponding module's `infra`, not as a business stand-in in `platform`

### 3.4 `transport`

Responsible for:

- handler
- request/response DTOs
- auth context decode
- parameter validation mapping
- public error mapping

Rules:

- External public API transport and `web` may share the same `application`
- External public API transport and `web` do not share DTOs or error mapping
- transport is not a container for business flows
- The request/response body of a formal API should directly use the OpenAPI generated types
- The DTOs, parameter requirements, and response shape of the external public API follow `openapi/*.json` directly
- The `web` transport must not reverse-pollute the external public API DTOs
- When the generated type is unsuitable as a local implementation detail, a local DTO / mapper may be defined inside `transport`, but must not be sunk into `application` or `domain`
- One of the core responsibilities of `transport` is exactly two explicit mappings:
  - generated request -> application input
  - application output -> generated response

### 3.5 OpenAPI-to-Module Mapping Requirements

Every OpenAPI endpoint must be able to answer:

- What the OpenAPI endpoint is
- Which business module it belongs to
- Which command or query it corresponds to
- Which external public API transport or `transport/http/web` handler serves it
- Which contract tests are required at minimum

Recommended record format:

```text
POST /workspaces/{workspace_id}/time_entries
-> source: toggl-track-api-v9.swagger.json
-> module: tracking
-> use case: StartTimeEntry
-> transport: tracking/transport/http/public-api
-> tests:
   - success contract
   - validation error
   - permission error
   - golden response
```

Custom OpenToggl interfaces are the same, for example:

```text
POST /api/imports
-> source: opentoggl-import.openapi.json
-> module: importing
-> use case: StartImportJob
-> transport: importing/transport/http/web
-> tests:
   - success contract
   - validation error
   - permission error
   - job accepted response
```

This mapping may be generated or maintained as a list, but must not be missing.

## 4. Command / Query Rules

Characteristics of a Command:

- Mutates the transactional source of truth
- Requires a transaction
- Requires registering audit or job records
- Returns the post-write result or minimal acknowledgement

Characteristics of a Query:

- Does not mutate the transactional source of truth
- Is allowed to go through a read model, projection, or query port
- Returns lists, details, aggregates, or the view needed for export preview

Rules:

- Do not mix reads and writes in the same use case
- `reports` is a query-first module by default — not a repository appendage of other modules
- Heavy aggregate read requests on Web pages should also exist as queries, not be smuggled into the handler

## 5. Composition Layer and Web Composition

Cross-module aggregate interfaces do not belong to any single business module's `domain`.

They belong in:

- `apps/backend/internal/web/`: cross-module composition interfaces needed by Web pages
- `apps/backend/internal/http/`: the top-level router, middleware, module mounting
- `apps/backend/internal/bootstrap/`: dependency assembly, provider wiring, config

Typical scenarios:

- A dashboard reads session, workspace, running timer, recent projects simultaneously
- A settings page composes tenant, billing, governance read models
- An admin page composes instance status, quota, job health

Rules:

- The composition layer only "stitches results from multiple modules"
- The composition layer does not own independent domain rules
- If an aggregation logic forms a stable business capability on its own, it should be moved back into some business module's `application/query`

## 5.5 Process and Assembly Boundaries of `apps/backend`

`apps/backend` is not a place for "arbitrary glue code". It has very specific responsibilities:

- `main.go`: process startup entry point
- `internal/bootstrap/`: dependency assembly, config parsing, lifecycle management
- `internal/http/`: top-level middleware, route registration, health checks, public server assembly
- `internal/web/`: cross-module Web composition queries

Explicitly excluded:

- Domain rules
- Intra-module repositories
- Intra-module SQL
- Query logic that belongs to a single business module only

Judgment rules:

- If the logic only serves `tracking`, it should return to `tracking/application`
- If the logic stably composes page data from `tracking + tenant + membership`, it belongs in `apps/backend/internal/web`
- If the logic is only database connection, server start/stop, middleware composition, it belongs in `bootstrap` or `http`

### 5.5.1 Local Development Startup Entry Point

The backend local development entry point is fixed as `air` executed from the repository root.

Rules:

- `air` is the only allowed entry point for local source-based backend development; `go run ./apps/backend` is no longer documented as the day-to-day development entry point.
- The root-level `.air.toml` is the single source of truth for backend hot-reload configuration; no second dev startup configuration is allowed inside `apps/backend`, the root-level `scripts/`, or any other wrapper layer.
- `.air.toml` is responsible for watching source changes and rebuilding/restarting `./apps/backend`, but does not change the formal application entry point; the real process entry point remains `apps/backend/main.go`.
- Local development and the default startup boundary use standard env names: `PORT`, `DATABASE_URL`, `REDIS_URL`. For generic startup concepts such as database, Redis, and listening port, do not continue inventing project-private parallel names.
- `PORT` expresses only the port number; on startup, the backend consistently listens on `0.0.0.0:<PORT>` and does not expose the full listen address as a default env contract.
- `DATABASE_URL` and `REDIS_URL` are required startup inputs; when missing, `bootstrap` must fail immediately, and must not fall back to a default DSN, in-memory implementation, or pseudo-dependency.
- `air` only serves local source development; tests, CI, production builds and self-hosted container startup must not depend on `air` staying resident.
- Local `air` source startup must not implicitly run `pgschema reconcile/apply` inside the application process; schema changes must go through the repo-external controlled `pgschema plan/apply` flow first, and only then the backend is started or restarted to verify the startup/dependency chain. The self-hosted container image is a separate release-state boundary — the entrypoint is allowed to run a controlled `pgschema apply` based on the same `DATABASE_URL` before starting the formal binary.
- To describe release state, smoke test, containerized runtime or debugging the formal binary, use the Go binary, `docker compose` or the corresponding startup commands directly — do not reuse `air`.

## 6. Permissions, Plans and Transactions

Permission and plan check points live in `application`.

Fixed rules:

- Permission checks are owned by the module that initiates the action
- The source of truth for feature gating is `billing`
- The source of truth for API quota / rate limit is `governance`
- transport only does error mapping and does not make the final decision

Transaction rules:

- One request has only one main transaction boundary
- The main transaction is held by the entry command
- When async follow-up is needed, write the `job record` inside the same transaction
- You must not casually refresh report projections or dispatch webhooks inside the main transaction

## 7. Cross-Module Collaboration

Allowed collaboration:

- `tenant/application` calls `billing/application` to fetch the default commercial state
- `tracking/application` calls `membership/application` to query permissions
- `webhooks/application` reads job payloads submitted by other modules
- `reports/application` reads projections or query ports from various modules

Forbidden:

- `tracking/infra` directly querying `membership/infra`
- `billing/domain` importing `tenant/domain`
- JOINing across modules in a repository and returning a "conveniently assembled" business result

Default priority for cross-module reads:

1. The other side's `application` query interface
2. Explicit query ports
3. `reports` or an operations-dedicated read model

Do not bypass boundaries by reasoning that "we're all in the same database".

## 8. Query Port and Repository

Repository only does:

- Aggregate root persistence
- Aggregate lifecycle queries
- Reads strongly related to the transactional write model

Query Port is responsible for:

- Lists
- Searches
- Aggregate statistics
- Page read models
- Cross-module projection views

Rules:

- List pages, table pages, report pages default to using query ports first
- Do not let repository evolve into a universal SQL toolbox
- A query serving a page does not mean it has to live in `transport`

## 8.2 How to Design Boundaries for the Testing Strategy

This document must directly support [testing-strategy](./testing-strategy.md) rather than figuring out "how to test" afterward.

Backend boundary design follows these fixed constraints:

- `domain` stays pure and in-memory testable, without introducing databases, HTTP, or time-source global singletons
- `application` use cases receive repository / query port / clock / job recorder / authz checker explicitly
- `infra` is responsible for real database and external-system wiring, but its behavior can be tested via real integration boundaries rather than mocking internal call ordering
- `transport` remains thin, only handling decode / encode / error mapping, and is not the carrier layer for backend business behavior tests
- `platform/jobs` provides a synchronously advanceable test entry point to avoid retry/backoff tests waiting in real time

This means the code structure must reserve the following testable interfaces:

- `Clock`
- `TxManager` or equivalent transaction execution abstraction
- `JobRecorder`
- `AuthContextDecoder`
- Permission/feature gate query interfaces
- External provider client interfaces

But these interfaces only appear at real boundaries — do not split internal logic into tons of meaningless interfaces "for mocking convenience".

Test mapping should be very direct:

- domain unit test -> `domain`
- application integration test -> `application + infra/pg + real tx`
- HTTP infrastructure test -> `internal/http + request logging + readiness/error handling`
- async execution test -> `platform/jobs + <module>/infra job handler`

If an implementation is hard to test quickly across these four layers, the first judgment should be that the boundary design is wrong, not that more mocks are needed.

## 8.5 What May Be Auto-Generated

To reduce mechanical labor for the external public API, the following artifacts are allowed to be generated:

- DTO types
- route / handler stubs
- request validator skeletons
- endpoint-to-usecase mapping lists
- contract test skeletons

Not allowed to be treated as the final implementation after generation:

- domain entities
- application command / query logic
- permission and transaction rules
- projector / webhook delivery / import execution

## 9. Jobs, Projectors, and Delivery Execution

The first version uniformly uses database `job record`s.

Responsibility split:

- `application/commands`: register jobs
- `platform/jobs`: provide the job runner, lease, retry, scheduling technical substrate
- `<module>/infra`: implement concrete job handlers
- `reports/infra`: implement projectors
- `webhooks/infra`: implement delivery execution
- `importing/infra`: implement continuation / replay / recovery

Rules:

- Job payloads must be retryable, auditable, and idempotent
- Projectors belong to `reports`, not stuffed into `tracking`
- Webhook delivery belongs to `webhooks`, not stuffed into a generic `integrations`
- Import does not by default replay historical webhooks, unless the contract documentation says otherwise

## 10. Boundary of `platform`

`platform` only provides technical capabilities:

- `db`
- `auth`
- `filestore`
- `jobs`
- `clock`
- `idempotency`
- `httpx`
- `observability`

`platform` does not own:

- Registration and invite flows
- Workspace default plan binding
- Notification strategy after deactivating users
- Any cross-module business orchestration

If an interface name contains an obvious business action, it probably shouldn't be in `platform`.

Minimum requirements for `observability`:

- Upon successful backend process startup, basic startup logs must be emitted, containing at least the listen address, service name, and key startup profile.
- HTTP entry must have basic request logging; at minimum the method, path, status, duration and an available subset of request id / trace correlation fields.
- On `/readyz` and dependency init failures, diagnosable logs must be emitted — not just a static status with no background evidence.
- "Process is alive" and "dependencies are ready" must be distinguishable from the logs and readiness result; a static `200 OK` must not be used to fake a working backend.
- These logs are part of the default startup/delivery requirements, not an optional capability that only exists in debug mode.

## 11. Backend Test Entry Points

The complete matrix is in [testing-strategy](./testing-strategy.md).

Minimum backend requirements:

- `domain` has unit tests covering invariants
- `application/commands` has transaction- and permission-level integration tests
- `transport/http/public-api` does not carry per-handler API-level tests; business behavior and regression protection land in the `application` service layer
- `reports` / `webhooks` / `importing` async execution chains have job-level tests
- The implementation of an external public API endpoint must still stay consistent with the OpenAPI contract, but is not carried by backend router/API-layer tests

Further structural requirements:

- `application/*_integration_test.go` runs use cases against real Postgres by default — no mocking repositories
- Business behavior, permissions, state transitions, and regression logic land in `application` service-layer tests by default; do not sink these assertions into router / handler unit tests
- Do not add per-handler API-layer tests in the form of each module's `transport/http/public-api/handler_test.go`
- Job tests that require time advancement must inject a controllable clock
- Job tests that require retries must advance scheduling synchronously in-process, without real sleep

## 12. Review Checklist

Backend review checks at minimum:

- Whether transaction boundaries only exist in command use cases
- Whether queries mistakenly went through repository or performed online scans on large OLTP tables
- Whether permissions and feature gating land in `application`
- Whether cross-module `infra` dependencies appear
- Whether jobs, projectors, and delivery execution land in the correct modules
- Whether `platform` is being misused as a "public business layer"
