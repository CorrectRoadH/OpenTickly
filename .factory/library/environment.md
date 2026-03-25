# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** runtime reuse rules, external services, env expectations, and doc-scope boundaries.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

- Local source-based validation must reuse the already running backend on `127.0.0.1:8080` and website on `127.0.0.1:5173`.
- Do not start replacement main runtimes for this mission. If either reused runtime is unavailable, return to orchestrator.
- PostgreSQL is external on `127.0.0.1:5432`; Redis is external on `127.0.0.1:6379`.
- Root `.env.local` is required because the mission uses the live source-based runtime the user already started.
- `pgschema` remains the only schema reconciliation path.
- Backend tests must never point at the development or production business schema. Use the dedicated `opentoggl_test` schema only.
- `pgtest.Open()` against `opentoggl_test` is the preferred backend-test helper. Use `pgtest.OpenEphemeral()` only when a test truly requires a throwaway schema.
- Browser readiness is gated by successful HTTP probes to `http://127.0.0.1:8080/readyz` and `http://127.0.0.1:5173`.
- The mission may update only the closed source-doc set listed in mission `AGENTS.md` unless the orchestrator expands that set first.
