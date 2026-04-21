# OpenToggl Testing Strategy

This document defines the testing layering, directories, and minimum coverage requirements, and answers:

- How frontend, backend, contract, and async execution chains are each tested
- Which capabilities must have unit tests, which must have integration tests, and which must go through e2e
- The minimum tests to add before new modules, new pages, and new contracts are landed
- Where test design should start, and how it serves as real acceptance evidence

The testing strategy serves the architecture; it does not define product semantics separately — product semantics still follow `product/`, `openapi/`, and necessary topic documents.

Because this project does not rely on a stable manual QA or product-acceptance flow, tests themselves are the main acceptance mechanism.

So this document additionally defines two hard constraints:

- The repo does not allow a category of slow tests "left for later optimization".
- The default development gate is the full-test gate; before `pre-commit`, the full suite must run locally quickly and give sufficient confidence.

Current OpenAPI sources are divided into:

- Toggl public APIs: `toggl-track-api-v9.swagger.json`, `toggl-reports-v3.swagger.json`, `toggl-webhooks-v1.swagger.json`
- OpenToggl custom: `opentoggl-web.openapi.json`, `opentoggl-import.openapi.json`, `opentoggl-admin.openapi.json`

The latter 3 are target state and should be filled in before the corresponding product surfaces are implemented.

## 0.1 Terminology Consolidation

This testing document consistently uses the following terms and no longer uses `runtime` as a catch-all:

- Real backend verification: the browser or HTTP client traverses real routes, real backend, real database/dependencies
- Startup/dependency evidence: process startup, schema alignment, readiness, dependency connectivity
- Async execution chain: job runner, projector, webhook delivery, import continuation

Some test file names in the current repo still carry the `real-runtime` suffix; that is existing naming and does not change the terminology choices in this document.

## 0. Testing Design Starting Point

The main starting point of test design is not OpenAPI, but the user stories defined in `docs/product/*.md`.

But this only defines the main line of acceptance testing; it does not mean every test must be directly bound to a complete user story.

Fixed order:

1. First read `docs/core/product-definition.md`
2. Then read the corresponding `docs/product/*.md`
3. Extract user stories, goals, key constraints, and failure scenarios from the PRD
4. Then map these user stories to unit / integration / page flow / e2e / contract / golden
5. Finally, use `openapi/*.json` to check that the public contract has not drifted

Conclusions:

- PRD defines "why we test and what target we test".
- User stories define "how to verify whether it is truly done".
- TDD, bugfix, boundary condition, and regression-protection tests define "which specific rules must never break again".
- OpenAPI defines "whether the public interface has deviated from the referenced public contract".

Test design must not degrade into "add tests per endpoint list".
Long-term names of test assets may only express product capabilities, contract boundaries, startup/host boundaries, or story goals; phase semantics may only live in plans and archives — they must not become the formal naming boundary for test names, fixture names, or generated contract test names.

## 1. Testing Principles

### 1.1 Tests Are Acceptance

- For OpenToggl, tests are not supplementary material — they are the body of result acceptance.
- Any conclusion claiming "implemented per the public definition", "implemented", or "releasable" should be directly supported by tests, not by manual walkthroughs.
- For external public APIs driven by `toggl-*` OpenAPI, acceptance is achieved primarily through user-story-driven page flow tests, e2e, and application integration tests, supplemented by contract tests and golden tests.

The following cases are "fake green" and cannot justify a completion claim:

- OpenAPI / schema / contract tests pass, but the real-backend page flow or e2e fails
- Unit tests cover mappers / formatters / hooks, but the corresponding user story has no page flow or e2e support
- Flows pass under a mock server, but real routes, real backend, and real browser paths have not been verified
- `pgschema plan` was not run, schema apply was not verified, yet database changes are claimed to be complete based only on application/unit tests
- A page can submit data, but there is no corresponding Figma/fallback alignment evidence, or it is still a placeholder skeleton
- Only the endpoint shape is proven correct, without proving the user goal is achieved

### 1.2 Full-suite Tests Must Be Fast

- The repo does not allow slow tests.
- Before `pre-commit`, run the full suite by default, not just a quick subset.
- The target for the full-suite total duration is `<= 30s`.
- If new tests push the full-suite total past this budget, refactor test design, fixtures, parallelism, or implementation structure — do not lower the gate.

### 1.3 Few Mocks, Prefer Real Dependencies

- By default, avoid mocks.
- Pure business rules get domain unit tests directly.
- Tests involving the database, routing, URL state, query cache, or background jobs prefer real dependencies and real integration boundaries.
- Only external uncontrollable system boundaries allow fakes / stubs, e.g. third-party webhook endpoints, payment providers, email providers.
- Do not use mocks to replay SQL, internal call orders inside HTTP handlers, or query cache details.

### 1.4 Still Keep Layering

The default proportion is still:

- Most tests are pure unit or small-scope component tests
- Key use cases have application-layer integration tests
- The frontend consumption boundary has OpenAPI client / schema alignment checks
- A small number of high-value full flows go through e2e

It is forbidden to put all confidence on e2e.

But "small number" here does not mean "slow" or "rare"; e2e is also part of the daily full-suite gate.

### 1.5 User Stories First

- An acceptance test should answer "which user story it serves".
- The main organizing method of the test suite is around user goals, not around a transport endpoint list.
- Prove first that the user goal holds, then prove the public contract is consistent.
- But not every test must be directly bound to a user story; TDD and regression tests may be bound to specific rules, defects, or boundary conditions.

A user story should at minimum include:

- Role
- Goal
- Successful outcome
- Key constraints
- Main failure branches

Examples:

- After a user enters a workspace, they can start a timer and continuously see a consistent running state across `calendar | list | timesheet`; after stopping, a time entry with Toggl semantics is produced.
- After an admin creates a webhook subscription, they can complete basic verification and see recent delivery results on the status page.
- After a user imports a minimal Toggl sample, they can see import result feedback and see corresponding data in the main tracking views.

### 1.6 TDD and Regression Tests Are Also a Formal Part

- During development, it is allowed and encouraged to write more fine-grained tests first, then the implementation.
- When fixing a bug, a regression test that reproduces the defect must be added first.
- Such tests do not require mapping to a complete user story, but must state the specific rule they protect.

Typical legitimate sources:

- domain invariants
- boundary conditions
- permission denials
- concurrency / idempotency / retry
- historical defect regressions
- the precise definition of a specific command / query / mapper / formatter

Requirements:

- Tests without a user-story owner must also answer "what specific behavior they protect".
- Do not write fragile tests that only prove implementation details and protect no external behavior or business rule.

## 1.7 Infrastructure and Schema Workflow Verification

Infra / bootstrap / schema management changes do not require mechanical TDD, but must have direct startup/dependency evidence.

For PostgreSQL schema-related changes, the fixed verification requirements are:

- The desired-state SQL has been updated in the repo's `pgschema` source of truth
- `pgschema plan` has been run and the output reviewed
- `pgschema apply` has succeeded against the target database or an equivalent test database
- After schema apply, the application can complete startup or smoke verification
- `readyz` returns ready only after database, Redis, schema reconcile, and initialization are all complete

Insufficient evidence includes:

- Only modifying the schema SQL file without running `pgschema plan/apply`
- Only verifying that a specific repository SQL statement works, without verifying the full schema consolidation
- Only running config/bootstrap unit tests, without running real database startup or readiness checks

## 2. Test Matrix

| Layer                    | Goal                                       | Location                                                                       | Focus                          |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------ |
| Domain Unit              | Invariants and value objects               | `apps/backend/internal/<context>/domain/*_test.go`                             | Pure business rules            |
| Application Integration  | Use cases, transactions, permissions, job records | `apps/backend/internal/<context>/application/*_test.go`                 | command/query orchestration    |
| Async Execution          | projector / delivery / import continuation | `apps/backend/internal/<context>/infra/**/*_job_test.go`                       | Idempotency, retry, recovery   |
| Schema / Startup Smoke   | `pgschema`, bootstrap, init, readiness     | `apps/backend/internal/bootstrap/**/*` + startup smoke                         | schema apply, init, deps ready |
| HTTP Infrastructure      | request id, readiness, error logging       | `apps/backend/internal/http/**/*_test.go`                                      | Platform HTTP infrastructure   |
| Frontend Unit            | formatter, mapper, helper                  | `apps/website/src/**/__tests__/*`                                              | Pure functions and mappings    |
| Frontend Feature         | Component interaction and mutation behavior | `apps/website/src/features/**/__tests__/*`                                    | Submit, error, state switching |
| Frontend Page Flow       | Page families and URL/query coordination   | `apps/website/src/pages/**/__tests__/*`                                        | route, search params, view switching |
| E2E                      | High-value cross-layer flows               | `apps/website/e2e/**`                                                          | User critical paths            |
| Frontend API Contract    | OpenAPI client and frontend consumption boundary | `apps/website/src/shared/api/__tests__/*`                                | Schema alignment, field compatibility |
| Public Contract Golden   | Toggl public contract baseline             | Landed near the relevant story in the corresponding module tests; no standalone golden directory under `apps/backend` is currently maintained | JSON shape, export/report baseline |

## 2.1 User Story to Test Layer Mapping

Each high-value user story should decompose into a group of acceptance tests, not just one layer:

- `Domain Unit`
  - Prove that the core rules and invariants the story depends on hold
- `Application Integration`
  - Prove the story's transactions, permissions, side effects, job records, and query semantics hold
- `Frontend Feature / Page Flow`
  - Prove the user's action flow on the page, URL state, and query/state assembly hold
- `E2E`
  - Prove the full user story works through the real application path
- `Frontend API Contract`
  - Prove the OpenAPI client consumed by the frontend, its field shape, and the agreed boundary have not drifted
- `Public Contract Golden`
  - Prove that the public output shape, export format, or payload style is consistent with the promised baseline

Requirements:

- High-value user stories must not land in contract tests only.
- External public APIs must not only have endpoint coverage but lack a story-driven acceptance chain.
- The same user story may involve multiple interfaces, but the test focus is always whether the goal is achieved, not whether every interface is covered.
- Backend business behavior, permissions, state transitions, and regression protection go by default into `application` service-layer tests; the router / handler layer is not the main behavior test carrier.

Beyond this, non-story tests are also allowed:

- TDD fine-grained design tests
- Bug regression tests
- Rule boundary tests
- Concurrency / idempotency / retry protection tests

These tests do not replace the user-story acceptance chain, but they are part of the stability defense line.

## 2.2 Completion Criteria and Failure Gates

A capability passes the test gate only when all of the following are true:

- The corresponding user story has an explicit mapping
- Key domain / integration / contract coverage exists
- If this capability introduces database structure changes, `pgschema plan/apply` and startup smoke evidence exist
- The corresponding formal page family has a page flow test
- At least one high-value real flow has e2e or real-backend verification
- The relevant root-level check commands pass — it cannot depend on "a subset being green"

The following cases must be treated as blocking, not as "to be added later":

- root `test`, root `check`, key smoke, or real-backend e2e fails
- Schema changes have not gone through `pgschema plan` review, or `pgschema apply` / startup smoke fails
- Only contract / golden, without page flow / e2e
- Only mocked browser flows, without real-backend verification
- A known testing gap exists but has not been explicitly recorded and downgrade-approved in the stories list

## 2.5 Execution Model and Time Budget

The full test suite must run in parallel, and be designed along these lines:

- Backend unit / integration / job tests may run concurrently; no serial dependency on shared dirty state is allowed.
- Frontend unit / feature / page flow must run concurrently, and each test file should be startable independently.
- Contract tests and golden tests must be batchable in parallel, not depend on manual environment preparation.
- e2e must run in parallel by default; browser tests must not be designed as serial long flows.

Suggested budget:

- Backend domain + application + async execution: `<= 8s`
- transport contract + golden: `<= 8s`
- Frontend unit + feature + page flow: `<= 8s`
- e2e full parallel: `<= 6s`
- Total budget: `<= 30s`

This is a gate budget, not an ideal; exceeding the budget indicates a test design problem.

## 3. Backend Testing Rules

### 3.1 Domain Unit

Must cover:

- entity invariants
- value object validation and comparison
- domain error branches
- core value objects such as time, money, duration, filter

Should not:

- Hit the database
- Depend on HTTP
- Depend on providers

### 3.2 Application Integration

Must cover:

- Transaction boundaries of commands
- Permission denials
- Feature gate denials
- audit / job record after successful writes
- Main filter and pagination semantics of queries
- Real interaction between `application` services and Postgres-backed adapters

Fixed rules:

- Use a real Postgres test DB or equivalent integration environment
- Each test prefers transaction rollback or equivalent isolation rather than rebuilding the DB
- Fixtures keep only the minimum runnable dataset
- Do not use mocks to replay SQL details
- Do not count a test that only constructs a `service` with stub / fake repositories as `Application Integration`
- Formal backend `Application Integration` evidence is recognized only from tests that run `service + postgres` together
- File names follow business or rule naming — do not repeat `integration` / `postgres` in file names
- Do not use generic naming like `service_test.go`, `service_integration_test.go` to carry formal backend application-layer evidence

### 3.3 Frontend API Contract

Must cover:

- The request parameter shape the frontend actually consumes
- The response field shape the frontend actually consumes
- Frontend error objects and compatibility fields
- Compatibility between the generated client and local query/mutation wrappers

Source rules:

- For external public APIs driven by `toggl-*` OpenAPI, the frontend contract tests take actual page-consumed fields as the entry point, with `toggl-*` OpenAPI as the contract verification source
- For OpenToggl custom interfaces, the frontend contract tests take `opentoggl-web`, `opentoggl-import`, `opentoggl-admin` as input sources
- If golden samples exist, they must be simultaneously consistent with the OpenAPI and the public behavior
- OpenAPI is only used for contract verification — not as the main starting point of test design
- Tests may be skeletoned from the OpenAPI, but only as assistance; assertion semantics and scenario selection must be driven by PRD user stories or explicit rules

Highest-priority contract tests include:

- time entries
- running timer
- projects / clients / tasks / tags
- key report queries
- webhook subscription / validate / ping / status
- importing entry and result reporting

### 3.4 Async Runtime

Must cover:

- Job idempotency
- retry / backoff / dead-letter or final failure state
- Projector incremental refresh and rebuild
- Webhook delivery record persistence
- Import continuation and partial failure recovery

Speed requirements:

- Job tests must run in-process — they cannot depend on a separate worker deployment
- Retry / backoff tests should use a controllable clock or synchronous scheduler advancement — real second-level waiting is not allowed
- Idempotency and recovery tests must be verified with minimal batch data — importing large samples to drag down the gate is not allowed

## 4. Frontend Testing Rules

### 4.1 Frontend Unit

Must cover:

- Date, duration, money formatting
- DTO -> view model mapper
- filter / URL adapter
- Form schema adapter

### 4.2 Feature Test

Must cover high-value features:

- start / stop timer
- create / edit time entry
- bulk update
- create / archive project
- webhook subscription create / validate

Focus:

- Success and failure states
- query updates after mutations
- modal / drawer / inline edit interaction flows

Rules:

- Use the real router, real query client, real form schema
- Do not write feature tests as pseudo e2e; cover only one explicit action flow
- Tests should directly reuse the adapters the page actually uses, not wrap another test-specific call chain

### 4.3 Page Flow Test

Must cover formal page families:

- `timer` page family: `calendar | list | timesheet`
- `project page`
- `client page`
- `profile`
- `settings`
- `integrations webhooks`

Focus:

- Whether URL state really lands in the address bar
- Whether different views share the same filter conditions and source of truth
- Whether page assembly correctly combines features and entities

Rules:

- Must use real route configuration and search params schema
- Page flow tests must cover state consistency after route enter / reload / back-forward
- Do not prove page behavior by hand-written mock URL adapters

## 5. E2E Coverage Boundaries

E2E design principles:

- e2e is not a slow test that runs only in CI; it is part of the daily gate.
- All e2e must run in parallel.
- Each e2e verifies only one high-value user path — it does not string together unrelated capabilities.
- e2e must use the minimum startup cost: single app start, minimum seed, lightweight login preparation, single browser with multiple contexts or equivalent.
- Do not write a giant "one-long-happy-path covering everything" test for convenience.
- Each e2e should map back to a clear PRD user story.

The following capabilities must have e2e:

- After login, enter a workspace, start and stop a timer
- Switch between `calendar/list/timesheet` without losing state
- Create a project and have it visible in the timer flow
- Webhook subscription creation and basic verification flow
- Import a minimal sample and see the result feedback

The following capabilities must not rely on e2e alone:

- domain invariants
- API error code matrix
- Report aggregation boundary conditions
- Job idempotency and retry logic

Speed constraints:

- A single e2e should complete in seconds.
- Login, workspace creation, and basic data preparation should reuse a unified fast entry point to avoid rebuilding large datasets for every test.
- When waiting for async results, prefer waiting on observable state — no long arbitrary sleep allowed.

## 6. Public Contract Golden Tests

Wherever there is an explicit commitment to align with Toggl's public output, prefer adding golden tests.

Applicable scenarios:

- External public API JSON shape
- Report export column order and field naming
- Webhook payload style
- Import result reporting

Positioning:

- Golden tests lock down public contract outputs; they do not replace user-story acceptance.
- Golden tests prove "the output hasn't drifted"; they don't by themselves prove "the user goal is achieved".

Rules:

- Golden samples must be labeled with their source — the corresponding `openapi/*.json`, upstream evidence, or topic rules
- When the contract source changes, update the source document first, then the golden
- Do not silently rewrite public field semantics just to make a test pass
- Golden samples should be small yet representative — do not drag down the gate with huge samples

## 6.5 The Role of OpenAPI in Testing

The role of OpenAPI is contract verification, not the starting point of test design.

For any formal API boundary, the corresponding OpenAPI is allowed and expected to generate:

- contract test skeletons
- request validation cases
- response shape smoke cases
- endpoint coverage lists

Constraints:

- Do not maintain a standalone TypeScript/Vitest contract or golden harness under `apps/backend`
- Backend contract verification preferentially lands in Go transport/bootstrap tests; verification of frontend-consumed contracts lands in `apps/website` or shared packages

But the real acceptance semantics must be filled in by PRD / user stories or explicit rules:

- User-goal achievement scenarios
- Key failure paths
- Permission scenarios
- Feature gate scenarios
- Business invariant scenarios
- Key assertions in golden samples

So the flow is fixed as:

1. Extract user stories from the PRD
2. Design acceptance chains with user stories
3. Add TDD / regression tests for fine-grained rules, defects, and boundaries
4. Use OpenAPI to verify the public contract

Do not reverse the process and patch together "looks like a lot" tests starting from an OpenAPI endpoint list.

## 7. Directory and Naming Rules

Backend:

- Unit tests: `*_test.go`
- Formal application-layer tests: `application/<business-or-rule>_test.go`
- Job tests: `*_job_test.go`

Frontend:

- Unit/component tests: `__tests__/xxx.test.ts`
- e2e: `apps/website/e2e/*.spec.ts`

The real frontend directory in the current repo is `apps/website`, and the test directory should take it as the source of truth first.

## 7.5 Data and Environment Rules

- Test data defaults to minimum samples — do not introduce large, slow seeds for the sake of "more realism".
- The test environment should stay as close as possible to the real startup path and real dependencies, but must be repeatable, parallelizable, and quickly cleanable.
- Database tests preferably use one-time initialization, multi-test reuse, and per-test isolation via rollback.
- External dependencies should use locally controllable stand-ins or in-process fake servers, limited to real system boundaries — do not fake internal modules.
- The environment variables required for tests to pass must stay minimal; do not layer temporary env switches on top just for testing.

## 7.6 Suggested Gate Order

Although the gate itself is the full test suite, execution should fail early:

1. Static checks and type checks
2. Backend domain / application / async execution
3. Frontend unit / feature / page flow
4. contract + golden
5. e2e

If the tooling supports it, schedule in parallel instead of mechanically serially; this expresses failure priority and does not require serial blocking.

## 8. Minimum Release Gate

Before a new capability lands, the minimum requirements are:

- The corresponding layer's unit tests or component tests are complete
- At least one integration test or page flow test covering the main success path exists
- If it exposes a public API, there is a contract test
- If it is an external public API, the test source has been explicitly aligned with `openapi/*.json`
- If it introduces an async job, there is a job test
- If it is a high-value user path, there is an e2e
- The full test suite still stays within the fast gate budget
- An acceptance test chain has been established for the corresponding PRD user story
- When a new bug or boundary rule is introduced, a corresponding regression test is in place

When there is no manual-acceptance safety net, additionally:

- The main user stories in the PRD have an explicit test mapping
- Public contract output has direct acceptance via contract or golden
- Key interactions have direct acceptance via page flow or e2e
- Transactions, side effects, permissions, and idempotency have direct acceptance via at least one layer of non-mock tests
- Known defects and high-risk boundaries have direct regression test protection

## 9. Review Checklist

Test review checks at minimum:

- Whether only the happy path was written
- Whether rules that should be unit tests were pushed to e2e
- Whether permission, feature gate, retry, concurrency, or idempotency scenarios were missed
- Whether there is a Toggl public contract output without a golden / contract test
- Whether page tests bypassed real URL state or query behavior
- Whether "slow" was taken for granted instead of continuing to compress test design
- Whether too many mocks, env switches, dedicated scaffolding, or one-off test code were introduced for test convenience
- Whether acceptance tests were designed starting from PRD user stories, not back-derived from endpoint lists
- Whether only contract tests exist with no acceptance tests for the user goal itself
- Whether regression tests that should be added via TDD or bugfix were missed
- Whether fragile tests that only bind to implementation details and protect no business rule or external behavior exist
