# User Testing

Validation surface, tool choices, and concurrency guidance for this mission.

**What belongs here:** browser/API validation surfaces, readiness rules, concurrency limits, isolation requirements.
**What does NOT belong here:** low-level service command definitions (use `.factory/services.yaml`).

---

## Validation Surface

### Browser surface

- Tool: Playwright website E2E
- Target runtime: reused local source-based frontend `5173` and backend `8080`
- Scope:
  - shell navigation to Timer
  - `/timer` direct entry
  - `calendar | list | timesheet` page-family behavior
  - workspace/org switch behavior
- Readiness rule: do not trust startup logs; require positive HTTP reachability on both `5173` and `8080` before launching browser validation.
- Parallelism: controlled via `PLAYWRIGHT_WORKERS` env (default: 2 workers). Tests use `test.info().workerIndex` for fixture isolation with unique email generation.

### Backend/API surface

- Tool: `go test` + direct transport smoke
- Dependency model: external PostgreSQL + Redis
- Schema rule: test writes must target the dedicated `opentoggl_test` schema only
- Isolation rule: tests share the external PostgreSQL service but isolate data by
  `Workspace + User` ownership inside `opentoggl_test`
- Async rule: keep real async enabled, use test-owned queue prefixes, restrict
  workers to test-owned data, and drain to idle before final assertions

## Validation Concurrency

### Browser validators

- Max concurrent validators: **2**
- Rationale:
  - machine resources observed: `10` CPU cores, `16 GiB` RAM
  - dry-run baseline already had high load and heavy memory usage
  - using 70% of realistic headroom, two browser validators is the safe starting point while the mission hardens readiness and fixture isolation
- Notes:
  - browser parallelism is enabled via `PLAYWRIGHT_WORKERS` env (default: 2)
  - if the mission materially reduces memory/load cost or strengthens
    isolation, this value can be revised upward by later validation
    synthesis

### Backend validators

- Max concurrent validators: **4**
- Rationale:
  - backend tests use shared external PostgreSQL and real async, so unrestricted parallelism would amplify contention
  - `4` keeps concurrency below half of available cores while leaving room for reused frontend/backend runtime processes and browser workers
- Notes:
  - unit/application lanes may run with higher internal parallelism once the
    mission proves they remain stable inside the dedicated test schema

## Flow Validator Guidance: browser

- Use the reused local website runtime at `http://127.0.0.1:5173` and backend
  runtime at `http://127.0.0.1:8080`.
- Stay within the assigned assertion set and browser session namespace.
- Do not change global user settings or reuse another validator's seeded
  workspace/user data.
- For timer/workspace flows, prefer validator-owned seeded facts and verify
  view-local evidence in `calendar`, `list`, and `timesheet` rather than
  page-wide proxy text.
- Capture console and network evidence for the assigned assertions.
- Parallel execution: use `PLAYWRIGHT_WORKERS` env to control worker count (default: 2).

## Flow Validator Guidance: backend

- Use the dedicated `opentoggl_test` schema only.
- Restrict reads and writes to validator-owned workspace/user fixtures.
- Do not mutate shared business data or non-test schemas.
- When async-sensitive behavior is involved, keep to test-owned queue prefixes
  and wait for the assigned flow to drain to idle before final assertions.
- Prefer direct readback and narrow proof for the assigned assertions instead of
  broad unrelated regression sweeps.
- Parallelism: use `-parallel 4` flag for backend tests. Use `OPENTOGGL_JOBS_QUEUE_NAME=test`
  for async test queue isolation.

## CI Schema Preparation

For CI environments with external Postgres:

- Use `ci_pgschema_prepare` command from `.factory/services.yaml`
- This runs `pgschema apply` against the CI's `DATABASE_URL`
- The dedicated test schema `opentoggl_test` is created/aligned automatically
- CI must provision external Postgres before running schema preparation
