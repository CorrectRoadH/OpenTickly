# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** required env vars, external services, test-schema boundaries, local-vs-CI setup notes.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

- Local source-based validation reuses backend `8080` and frontend `5173`.
- PostgreSQL is external on `localhost:5432`; Redis is external on `localhost:6379`.
- Mission tests must use a dedicated **test schema** named `opentoggl_test` in the shared PostgreSQL service; never point mission tests at the development or production business schema.
- `pgschema` is the only schema reconciliation path for both local and CI validation.
- Backend tests use ephemeral per-test schemas (`opentoggl_test_{timestamp}`) created by `pgtest.Open()`, which provides superior test isolation compared to a shared schema approach. Each test gets its own schema, tests clean up via `t.Cleanup()`, and orphaned schemas from interrupted runs can be cleaned up with: `psql -d opentoggl -c "DROP SCHEMA IF EXISTS opentoggl_test_* CASCADE;"`
- The `opentoggl_test` schema name prefix is reserved for the dedicated test schema concept; actual test schemas use the ephemeral pattern for parallel safety.
- Browser readiness on reused local runtime is gated by HTTP probe to `/readyz` on backend and HTTP GET to frontend.
