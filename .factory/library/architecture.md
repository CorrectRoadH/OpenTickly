# Architecture

Mission-specific architectural guidance for the tracking testing system.

**What belongs here:** test-layer roles, isolation model, regression strategy, naming decisions.
**What does NOT belong here:** one-off run output or temporary debugging notes.

---

- Frontend validation hierarchy for this mission:
  - `E2E` means real-runtime browser validation
  - page flow tests protect page-family and state/route behavior
  - feature/component tests are reserved for high-signal local interaction risk
- Backend validation hierarchy for this mission:
  - Go unit/application tests are the primary lane
  - real PostgreSQL is required
  - transport/contract smoke stays thin and targeted
- Shared test topology:
  - one external PostgreSQL service (`localhost:5432`)
  - one dedicated Redis service (`localhost:6379`)
  - one dedicated test schema `opentoggl_test` managed by `pgschema`
  - test isolation inside that schema is achieved with `Workspace + User` ownership, not business-schema reuse
  - real async stays on, with test-owned queue prefixes, worker-ownership boundaries, and drain-to-idle before final assertions
- Async test queue guardrails (explicit and reproducible):
  - **Queue prefix convention**: tests use a dedicated queue name via `OPENTOGGL_JOBS_QUEUE_NAME`. The canonical local default is `test`. Set `OPENTOGGL_JOBS_QUEUE_NAME=test` when running backend tests to ensure test jobs are isolated from production job flows.
  - **Worker ownership**: test workers must only process jobs from the test-owned queue prefix. Workers configured with a non-test queue name must not consume test queue messages, and vice versa. This prevents test workers from accidentally processing or interfering with production job state.
  - **Drain-to-idle**: before final assertions in any test that enqueues async work, the test must wait for all enqueued jobs to complete. Use the worker's drain mechanism (e.g., poll or wait-group) to reach idle state before asserting results. This ensures test assertions run against settled state, not in-flight work.
- Backend tests use `pgtest.Open()` which connects to the canonical shared `opentoggl_test` schema. Tests needing full isolation can use `pgtest.OpenEphemeral()` which creates a timestamped schema that is dropped on cleanup.
- Backend tests must not write into the development or production business schema.
- Do not invent undocumented tracking semantics; prove consistency against docs and record discovered canonical behavior before broadening contract assumptions.
