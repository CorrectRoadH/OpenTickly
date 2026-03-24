# Testing Lanes

Named validation lanes used by this mission.

**What belongs here:** lane intent, what goes where, and why a lane exists.
**What does NOT belong here:** command syntax already captured in `.factory/services.yaml`.

---

- `frontend-pageflow`
  - purpose: fast protection for page-family, route/state, and workspace scoping behavior
  - primary surfaces: timer page family, shell-to-timer entry

- `frontend-e2e`
  - purpose: real-runtime story acceptance
  - rule: new files use normal `*.spec.ts`; E2E already implies real runtime
  - parallelism: controlled via `PLAYWRIGHT_WORKERS` env (default: 2 workers)
  - isolation: tests use `test.info().workerIndex` for unique email generation

- `backend-mainline`
  - purpose: real-Postgres method/application coverage for stopped-entry lifecycle and current-timer semantics
  - parallelism: `-parallel 4` by default; individual lanes available (unit, application)

- `backend-regression`
  - purpose: narrow bug repro for conflict handling, historical retention, and stale-read contradictions

- `parallel-hardening`
  - purpose: stabilize lane boundaries, readiness gating, fixture isolation, and CI reproducibility
  - browser lane: `workers: parseInt(process.env.PLAYWRIGHT_WORKERS || "2")` in playwright.config.ts
  - backend lane: explicit parallel boundaries with `go test -parallel 4`
  - CI schema prep: `ci_pgschema_prepare` command uses `pgschema apply` with `DATABASE_URL`
  - isolation model: shared `opentoggl_test` schema with Workspace+User ownership
  - async guardrails: `OPENTOGGL_JOBS_QUEUE_NAME=test` for test-owned queue isolation
