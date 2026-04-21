# OpenToggl Technical Architecture

This document defines the target technical architecture of `OpenToggl` and answers four questions:

1. How to use a single system to carry Toggl's current public API, Web UI and import capabilities simultaneously.
2. How to keep the same public contract and feature surface between Railway deployment and Docker Compose self-hosted deployment.
3. What tech stack the frontend and backend use, and how the code is organized.
4. How to evolve the current repository from scaffolding into a deliverable implementation step by step.

This document is an implementation blueprint; it does not replace OpenAPI, Figma, or the corresponding PRDs. For specific public boundaries, page semantics, feature details, and domain object definitions, follow the upstream inputs and the corresponding documents under `docs/` respectively.

## 1. Architecture Goals

The technical architecture of `OpenToggl` must satisfy the following goals simultaneously:

- Externally cover `Track API v9`, `Reports API v3`, and `Webhooks API v1` in full.
- Provide a Web UI that covers all public capabilities, not just an API surface.
- Keep the public OpenAPI, CLI and skill integration friendly to AI/automation, but do not design a separate AI API product surface.
- Support both Railway hosted deployment and Docker Compose self-hosted deployment, and keep the public product surfaces consistent.
- Support importing Toggl data and preserve the original IDs as much as possible.
- Handle reports, webhooks, export, audit, quota and eventual consistency in a verifiable way.

## 2. Tech Stack

- Frontend: `React + Vite+ + Tailwind CSS 4`
- Backend: `Go`
- Database: `PostgreSQL`
- PostgreSQL schema management: `pgschema`
- Cache and short-lived state: `Redis`
- File storage: `PostgreSQL Blob`
- Deployment: `Railway` / `Docker Compose`

Notes:

- The frontend consistently uses `React + Vite+ + Tailwind CSS 4`, carrying the complete Web UI and admin backend.
- `Tailwind CSS 4` is part of the official frontend stack, not an optional preference; it owns page layout, spacing, grid and general utility styling.
- Component capabilities based on `baseui` remain part of the frontend topic architecture, with `styletron` providing its theme and override styling engine.
- The backend is implemented in Go. The first version uses a single API process to handle synchronous requests and necessary background tasks; no separate worker is split out.
- PostgreSQL schema uses `pgschema`-managed declarative desired-state SQL as the single source of truth; no second schema workflow is maintained long-term in parallel.
- The first version of file storage does not introduce object storage — attachments, export artifacts and brand assets all go through PostgreSQL Blob.

## 2.1 Terminology Consolidation

This document no longer uses `runtime` as a generic catch-all. When referring to different semantics, use the following terms:

- Startup path: how the process starts, e.g. running `air` from the repo root
- Startup inputs: startup env such as `PORT`, `DATABASE_URL`, `REDIS_URL`
- Process topology: single Go process, whether to split an independent `website` container, whether to split a worker
- Assembly boundary: how `bootstrap` / `http` / `platform` wire dependencies
- Async execution chain: job runner, webhook delivery, report projector, import continuation
- Real backend verification: page flow or e2e where the browser goes through real routes, real backend, real database/dependencies

The default commands for local development and self-hosted are also stated explicitly, instead of using ambiguous terms:

```bash
# source-based local development
vp run website#dev
air

# self-hosted smoke / release-style verification
docker compose up -d postgres redis
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql
docker compose up -d --build opentoggl
```

## 3. Design Principles

### 3.1 One product, no forks

- The Railway build and the Docker Compose self-hosted build share the same domain model, API contract, and Web feature surface.
- Differences are only permitted in deployment style, environment variables, and operational tooling.

### 3.1.1 Separation between local development and self-hosted delivery

- Local development defaults to running from source: frontend and backend are each started from the repo root (`vp run website#dev` + `air`).
- The local dev frontend is served by the `Vite` dev server; browser requests are proxied to the Go API via a Vite proxy. The default proxy target is `OPENTOGGL_WEB_PROXY_TARGET`; when unset it points to `http://127.0.0.1:8080`.
- Backend local development uses hot reload through the root-level `.air.toml`; `air` is only used for local source development — CI, production builds and self-hosted release paths do not depend on `air`.
- `docker compose` belongs to the self-hosted delivery, deployment rehearsal and release-state smoke verification path; it is not the default local development path.
- Environment variables needed for local development are consolidated at the repo root, avoiding scattering configuration across apps.
- Local dev env conventions are consolidated at the repo root: `.env.example` is the template, `.env.local` is the machine-local runtime file.
- `.env.local` is a required input for source-based local development; `.env.example` is only used to copy-generate the machine's config.
- Backend source development uses standard startup env: `PORT`, `DATABASE_URL`, `REDIS_URL`; these connection/listening boundaries no longer use project-private aliases.
- Backend local startup must not depend on a built-in datasource fallback. If a critical env is missing, the process must fail immediately, not fall back to an in-memory implementation or pseudo-default configuration.
- The local Go backend during development must connect to real PostgreSQL and Redis by default; "being able to start a fake backend / placeholder path" does not count as a working backend.

### 3.2 Monolith first, do not split the deployment into multiple processes up front

- The first version keeps only one Go process under `apps/backend`.
- The Web frontend is still built independently as `apps/website`, but the self-hosted delivery defaults to "first build the frontend static artifact, then embed it in the Go backend binary, with the same process serving both pages and API".
- `reports`, `webhooks`, and `import` are isolated at the code structure level, but still run in the same Go backend process.
- Do not introduce worker, queue systems or multi-service call complexity up front "to look modern".
- Self-hosted does not by default require an additional independent `website` container or Nginx process; if the deployment environment already has an ingress layer, it only takes on TLS / ingress duties and does not change the default delivery shape.

### 3.3 Single transactional source of truth; evolve read/write split as needed

- The transactional write model has PostgreSQL as the core source of truth.
- The PostgreSQL structure definition is governed by the `pgschema` desired-state SQL in the repo; structural consolidation on a live database must go through `pgschema plan/apply`.
- Capabilities with high read or async traffic — reports, export, webhooks, search — can be decoupled via projections, job tables and caches.
- The first version may start from a single database, but must preserve boundaries for evolving toward an independent read model.
- Source-based local development follows the same single-source-of-truth principle: the transactional write path cannot be replaced with an in-memory store or placeholder backend path.

### 3.4 Public contract takes precedence over internal implementation

- For external APIs, the path, parameters, error semantics, authentication, rate-limit expression and request handling/delivery behavior take priority.
- Internal module naming, package structure and storage model can be optimized for implementation efficiency, but must not break the external public definition.

### 3.5 Workspace is the main business boundary, Organization is the governance boundary

- Most core business objects revolve around `workspace`.
- `organization` is typically the main attachment point for governance, subscription, and cross-workspace management on the public product surface.
- This does not mean that in the code structure an `organization` or `tenant` module owns all the business substance of billing / quota / governance.
- At the code level the following should be separated:
  - `tenant` owns organization / workspace and their association relationships
  - `billing` owns plan / subscription / invoice / customer / commercial quota
  - `governance` owns API quota / audit / retention / status

### 3.6 Code structure uses clearly-ruled domain boundaries + Hexagonal composition

"DDD-lite" as a one-liner is not acceptable here.

The concrete rules in this project are:

- Code is first split into modules by business context, such as `identity`, `tracking`, `reports`, `webhooks`.
- Each module is internally split into `domain`, `application`, `infra`, `transport`.
- `transport` handles HTTP input/output and the public DTOs.
- `application` handles use case orchestration, transactions, authorization, and call ordering.
- `domain` handles entities, invariants, and domain rules.
- `infra` handles implementations like Postgres, Redis, external HTTP, and file storage.

This is not term-driven "pure DDD"; it is an engineering structure designed to control complexity and support evolution and testing.

## 4. System Context

```text
Clients
├── Toggl API consumers
├── OpenToggl Web App
├── AI agents / automation
└── Admin / import operators

Edge
└── Web Ingress / Railway Edge

Application Layer
├── Identity & Session
├── Core API
├── Reports API
├── Webhooks Delivery
├── Import Service
└── In-Process Background Jobs

State Layer
├── PostgreSQL (OLTP + blob store + job records, schema managed by pgschema)
├── Redis
└── Analytics Read Model

External Integrations
├── Email / notification provider
├── Payment provider
└── User webhook endpoints
```

## 5. Logical Module Breakdown

### 5.1 Identity & Session

Responsible for:

- Register, sign-in, sign-out
- `Basic auth(email:password)` entry
- `Basic auth(api_token:api_token)` entry
- Session cookie entry
- API token lifecycle
- Current user and preferences read

### 5.2 Core API

Responsible for:

- Main capabilities of Track API v9
- organizations / workspaces / memberships
- clients / projects / tasks / tags
- time entries / running timer
- approvals / expenses / goals / favorites / reminders
- audit / quota / meta / status
- The transactional write interfaces within the billing surface

Notes:

- `Core API` is the main write-model entry point.
- Each successful mutation must write the business data and the necessary background job record inside the same transaction.

### 5.3 Reports API

Responsible for:

- Queries, exports, saved/shared reports for Reports API v3
- detailed / summary / weekly / trends / profitability / insights

Notes:

- Reports is logically an independent read model — it should not degrade into an ad-hoc online join per query.
- But the first version still runs in the same Go API process.

### 5.4 Webhooks Runtime

Responsible for:

- Webhook subscription CRUD
- validate / ping / limits / status
- Event filtering, signing, delivery, retries and failure governance

### 5.5 Import Service

Responsible for:

- Importing Toggl export data
- Strategy for preserving original IDs
- Conflict detection, partial-success reporting, retries and audit

### 5.6 In-Process Background Jobs

Responsible for:

- report projection
- webhook dispatch
- export generation
- import continuation
- billing / quota re-evaluation after import
- notification / cleanup / maintenance jobs

Notes:

- These tasks run in a background job runner inside the Go API process.
- They can be triggered and recovered via a database job table, without deploying separate workers.

## 6. Core Data Flows

### 6.1 Transactional Write Path

```text
Client Request
-> Web Ingress
-> Auth / Permission Check
-> Core API Command Handler
-> PostgreSQL Transaction
   -> Domain Tables
   -> Audit Records
   -> Job Records
-> Commit
-> Return Public Response
```

Requirements:

- External responses are preferably generated from the transactional source of truth.
- Public interface error codes, validation failures and permission denials must be finalized here.
- The official startup chain is fixed as: establish database connection -> use `pgschema` to reconcile the live schema to the repo desired state -> run instance init / bootstrap guard -> then expose readiness. For the self-hosted runtime, this step is completed by the container entrypoint before the main HTTP process starts.

### 6.2 Background Task Path

```text
Committed Transaction
-> Job Scheduler / Job Table
-> Report Projector
-> Webhook Dispatcher
-> Cache Invalidation
-> Notification / Export Jobs
```

Requirements:

- All background tasks must be idempotent per task id or equivalent job identifier.
- Failed tasks must be retryable, observable and manually replayable.

### 6.3 Reports Read Path

```text
Client
-> Reports API
-> Analytics Read Model
-> Export Job (in-process)
-> PostgreSQL Blob / Download URL
```

Requirements:

- Report statistical semantics follow the corresponding OpenAPI, Figma and `docs/product/reports-and-sharing.md`.
- Online queries and async exports share the same filter and permission semantics.

### 6.4 Webhook Delivery Path

```text
Core Mutation
-> Internal Event / Job
-> Webhook Matcher
-> Delivery Record
-> Signed HTTP Request
-> Retry / Backoff
-> Final Status
```

Requirements:

- Request signatures, event IDs, attempt logs and final failure states must be persisted.
- `validate`, `ping`, `limits`, and `status` must not bypass the official delivery chain.

## 7. Data Storage Architecture

### 7.1 PostgreSQL

As the transactional source of truth, mainly stores:

- identity / session metadata
- organizations / workspaces / memberships
- clients / projects / tasks / tags
- time entries / expenses / approvals / favorites / goals
- billing core facts
- webhook subscriptions / delivery metadata
- import jobs / import mappings
- async job records
- audit logs

Multi-tenant strategy:

- Logical multi-tenancy by default.
- Core business tables carry `organization_id`.
- Workspace-level core objects also carry `workspace_id`.

### 7.2 Analytics Read Model

Mainly stores:

- report facts
- summary / weekly aggregates
- profitability / trend projections
- structures that accelerate saved/shared report queries

Implementation guidance:

- The first version may still live in PostgreSQL, split by schema or table.
- Later, it can evolve to a separate analytics database as load grows, without changing the external API.

### 7.3 Redis

Mainly used for:

- session / short-lived cache
- rate limiting
- quota counters
- idempotency keys
- temporary job state

Notes:

- Redis is not required for deployment.
- For the first version, if further simplification is desired, rate limiting, idempotency and short-lived state may also be stored in PostgreSQL first.

### 7.4 PostgreSQL Blob File Storage

In the first version, all file storage goes into PostgreSQL, managed by tables like `file_blobs` and `file_objects`.

Mainly used for:

- expense attachments
- avatars / logos
- exported report files
- invoice / receipt artifacts
- import source archives

Constraints:

- File metadata and content access both go through a unified `filestore` abstraction — business code must not directly read/write blob tables.
- Railway deployment and Docker Compose self-hosted deployment use the same semantics; only the underlying database instance differs.

## 8. Module Boundaries and Code Organization Guidance

The current repository is still a Vite+ monorepo scaffold. It should evolve into the following structure:

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
      reports/
      webhooks/
      billing/
      importing/
      platform/

packages/
  web-ui/
  shared-contracts/
```

Notes:

- `Organization` and `Workspace` are public product resources and tenant entities, but at the code level they are consolidated under `tenant`.
- `governance` is a formal top-level module, and should not be hidden under `organization` or `workspace`.
- `platform` is the shared technical substrate, not a business context.
- Specific directories and dependency rules follow `docs/core/codebase-structure.md` below.

Suggested responsibilities:

- `apps/website`: the current React Web UI main app; until the formal frontend boundary refactor, it is the de-facto source of truth for the frontend directory.
- `apps/backend`: the Go backend application entry point, carrying the external public API driven by `toggl-*` OpenAPI, the Web admin interfaces and the in-process background jobs.
- `packages/web-ui`: reusable frontend UI, hooks, and frontend utility functions.
- `packages/shared-contracts`: a small amount of public types shared between frontend and backend that are not part of the externally public API layer.
- `apps/backend/internal/<context>`: backend module code split by business context.
- `apps/backend/internal/platform`: shared infrastructure — database, auth, cache, file storage, background jobs, observability, etc.

Constraints:

- The external public API and the Web UI must share the same domain model and permission semantics.
- The Web UI must not bypass the application layer to write to the database.
- The backend must not degrade into a `controllers/services/repositories` layout that is tiled by technical layer.

## 9. API Layering Strategy

### 9.1 External Public API Layer

Responsibilities:

- Expose the external public paths and response structures defined by the `toggl-*` OpenAPI
- Carry the corresponding public authentication, error semantics, pagination and headers

Requirements:

- This layer can have DTOs / mappers, but must not carry core business rules.

### 9.2 Internal Application Layer

Responsibilities:

- Command processing
- Query orchestration
- Permission checks
- Transaction boundaries
- Background task registration

### 9.3 Domain Layer

Responsibilities:

- Entities
- Invariants
- Lifecycle constraints
- Business rules that the public definition requires to exist stably

### 9.4 Infrastructure Layer

Responsibilities:

- PostgreSQL / Redis / blob store / external provider adapters

## 10. Permissions and Multi-Tenancy Model

The permission model should revolve around the following objects:

- `OrganizationUser`
- `WorkspaceUser`
- `Group`
- `GroupMember`
- `ProjectUser`
- `ProjectGroup`

Implementation requirements:

- All read/write paths must explicitly carry the tenant boundary.
- Permission decisions must not be scattered across controllers and SQL concatenation — they must be concentrated in application-layer policies.
- Reports, Webhook, Import share the same authorization semantics.

## 11. Consistency Model

`OpenToggl` should not promise immediate consistency on all read surfaces. It should adopt the following model explicitly:

- The transactional write model is strongly consistent.
- Reports, webhooks, exports, and some status pages are allowed to be eventually consistent.
- The API and Web UI must present explainable states for such delays, rather than implicit failures.

Implementation requirements:

- Each type of background task must define retry, recovery and manual replay strategies.
- User-facing critical async flows must have queryable job status or delivery status.

## 12. Observability and Operations

The first version should already provide the following capabilities:

- Structured logs
- request / job trace id
- Audit logs
- Core business metrics
- Background task backlog monitoring
- Webhook success rate, retry rate, deactivation rate
- Report generation latency and failure rate
- Import success rate, conflict rate, rollback rate

Guidance:

- API requests and background jobs should use a unified trace correlation key.
- The admin backend should eventually provide at minimum an operational view, rather than relying solely on external monitoring systems.

## 13. Deployment Topology

### 13.1 Railway

Recommended topology:

- Railway Web Service: `opentoggl` (single Go process providing API and the embedded Web assets)
- Railway PostgreSQL
- Redis

Notes:

- If the current repository or legacy deployment still has a separate `website` process/service, treat that as implementation drift to be cleaned up, not the target topology.

Characteristics:

- Minimize process and container count as much as possible.
- Suitable for fast first-version releases and continuous iteration.

### 13.2 Docker Compose Self-Hosted

Minimal usable topology:

- `opentoggl`
- `postgres`
- `redis`

Where:

- `opentoggl` is a single Go process container, simultaneously providing Web UI static assets, SPA route fallback, and HTTP API.
- `apps/website` is still a source-development entry point, but is not a service that needs separate deployment in the self-hosted release state.

Characteristics:

- Can run on a single host
- Self-hosted defaults to delivery as a single application image, not two frontend+backend images
- It is acceptable to start from a single Go backend process + PostgreSQL
- The external feature surface is not trimmed

## 14. Current Repository State and Next Landing Steps

Current repository state:

- Product definition, domain model, architecture and topic PRD documents already exist.
- Toggl OpenAPI and mirrored official documentation are included.
- Code is still at the Vite+ monorepo starter stage; business implementation has not yet begun.

Suggested landing order:

1. First determine the monorepo module boundaries and directory structure.
2. Stand up `apps/backend`, and evolve the current `apps/website` into the official Web main entry point.
3. Land the first version of the `domain`, `application`, `auth`, `db`, `filestore`, `jobs` foundation layers.
4. Prioritize wiring up the main write paths for Identity, Workspace, Projects, Time Entries.
5. Introduce the job table and in-process job runner, then expand reports/webhooks/import.
6. Finally fill in a more complete operational surface and low-frequency capabilities.

## 15. Relationship to Other Documents

- `docs/core/product-definition.md`: defines product goals, and the dependency relationships between OpenAPI / Figma / PRDs.
- `docs/core/codebase-structure.md`: defines the frontend/backend directory structure, dependency direction and module rules.
- `docs/core/frontend-architecture.md`: defines frontend state management, component boundaries and page implementation structure.
- `docs/core/backend-architecture.md`: defines the internal structure of backend modules, the composition layer and the async execution chain rules.
- `docs/core/testing-strategy.md`: defines the test matrix, directories and minimum release gates.
- `docs/core/domain-model.md`: defines domain objects, contexts, aggregates and invariants.
- `openapi/*.json`: defines the strong-constraint input for the API public contract.
- Figma: defines the strong-constraint input for the UI public definition.
- `docs/product/*.md`: supplements the functional details not fully expressed by OpenAPI and Figma.

This document is responsible for consolidating these documents into a unified engineering implementation blueprint.
