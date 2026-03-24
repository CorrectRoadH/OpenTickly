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
  - test isolation via ephemeral per-test schemas (`opentoggl_test_{timestamp}`) created by `pgtest.Open()`
  - each test gets its own schema for superior isolation during parallel test execution
  - real async kept on, with test-owned queue prefixes (queue name configurable via `OPENTOGGL_JOBS_QUEUE_NAME`)
- The `opentoggl_test` schema name prefix is reserved; actual implementation uses ephemeral schemas for parallel safety.
- Backend tests run against isolated ephemeral schemas, not the production/development schemas.
- Do not invent undocumented tracking semantics; prove consistency against docs and record discovered canonical behavior before broadening contract assumptions.
