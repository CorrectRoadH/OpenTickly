# OpenToggl

## Local Development

- Install backend dev runtime: `go install github.com/air-verse/air@latest`
- Install PostgreSQL schema tool: `pgschema`
- Install workspace dependencies and sync the versioned git hooks: `vp install` then `git config core.hooksPath .vite-hooks`
- The versioned pre-commit hook validates the website build with `vp run website#build`
- Create root `.env.local` from `.env.local.example` before starting local source processes
- Required backend env: `PORT`, `DATABASE_URL`, `REDIS_URL`
- Required `pgschema` env for schema management: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- Frontend: `vp run website#dev`
- Landing site: `vp run landing#dev`
- Backend: `air`
- Backend hot reload config: root `.air.toml`
- Run `air` from the repository root so bootstrap can load root `.env.local`
- `.env.local.example` is only a template; the canonical source-based backend startup path requires a real root `.env.local`
- `air` must fail immediately if `.env.local`, `PORT`, `DATABASE_URL`, or `REDIS_URL` is missing
- `air` must also fail immediately if PostgreSQL or Redis is unreachable; local backend development is expected to connect to the real dependencies you started separately

## PostgreSQL Schema Workflow

- PostgreSQL schema is managed with `pgschema`
- Repository desired state is the only schema source of truth
- Do not apply ad hoc DDL directly to the development database as the canonical path
- Do not introduce a second migration tool or ORM auto-migrate path

Canonical local workflow:

```bash
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql
air
```

Rules:

- Edit repository schema SQL first
- Review `pgschema plan` before `pgschema apply`
- Run `air` only after the target database schema has been reconciled
- `DATABASE_URL` and the `PG*` variables used by `pgschema` must refer to the same PostgreSQL database
- The self-hosted container image is different: its runtime entrypoint runs `pgschema apply --auto-approve` from `DATABASE_URL` before starting the API process
- The runtime image also projects `DATABASE_URL` into `PGSCHEMA_PLAN_*`, so `pgschema apply --file ...` uses the target PostgreSQL server as its plan database instead of requiring embedded PostgreSQL startup

# Self Hosting

Self-hosted delivery uses a single `opentoggl` application image (embedded web + API), plus `postgres` and `redis` dependencies in `docker-compose.yml`.

Release artifacts that must ship together:

- `docker/opentoggl.Dockerfile`
- `docker-compose.yml`
- `docs/self-hosting/docker-compose.md`

## Compose Startup and Smoke

1. Start runtime and dependencies: `docker compose up -d --build`
2. The `opentoggl` container entrypoint runs `pgschema apply --auto-approve` against `DATABASE_URL` before the API process binds HTTP
3. Verify readiness and key-path smoke:

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsSI http://localhost:8080/
```

Optional operator overrides can still be provided through host env vars or an operator-managed env file passed with `docker compose --env-file`.
Set `OPENTOGGL_SCHEMA_RECONCILE=skip` only when you intentionally need to bypass the automatic entrypoint reconcile.

## Upgrade and Rollback

- Upgrade: pull new image, review `pgschema plan` out-of-band if needed, restart `opentoggl`, let the entrypoint re-apply desired state, rerun smoke checks.
- Rollback: revert desired schema SQL and image tag to the target release, review rollback `pgschema plan` out-of-band if needed, restart `opentoggl`, let the entrypoint reconcile to the target desired state, rerun smoke checks.
- Persistent data is in the PostgreSQL volume `opentoggl-postgres-data`.

Detailed operator runbook:

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)

Verification evidence location:

- `docs/testing/evidence/self-hosted/`
- `docs/testing/evidence/self-hosted/2026-03-22-compose-smoke.md`
