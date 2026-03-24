# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** required env vars, external services, test-schema boundaries, local-vs-CI setup notes.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

- Local source-based validation reuses backend `8080` and frontend `5173`.
- PostgreSQL is external on `localhost:5432`; Redis is external on `localhost:6379`.
- Mission tests must use a dedicated **test schema** named `opentoggl_test` in the shared PostgreSQL service; never point mission tests at the development or production business schema.
- `pgschema` is the only schema reconciliation path for both local and CI validation.
- Backend tests use the dedicated shared test schema `opentoggl_test` managed by `pgschema`. Test isolation inside that schema is achieved with `Workspace + User` ownership, not per-test schema isolation. The `opentoggl_test` schema is the single canonical test schema for the mission.
- Orphaned schemas from interrupted test runs can be cleaned up with: `psql -d opentoggl -h localhost -U postgres -c "DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT schema_name FROM information_schema.schemata WHERE schema_name ~ '^opentoggl_test_[0-9]+$' LOOP EXECUTE 'DROP SCHEMA ' || quote_ident(r.schema_name) || ' CASCADE'; END LOOP; END $$;"`
- Browser readiness on reused local runtime is gated by HTTP probe to `/readyz` on backend and HTTP GET to frontend.
