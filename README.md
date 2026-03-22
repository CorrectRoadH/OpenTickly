# OpenToggl

## Local Development

- Install backend dev runtime: `go install github.com/air-verse/air@latest`
- Install PostgreSQL schema tool: `pgschema`
- Create root `.env.local` from `.env.local.example` before starting local source processes
- Required backend env: `PORT`, `DATABASE_URL`, `REDIS_URL`
- Required `pgschema` env for schema management: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- Frontend: `vp run website#dev`
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

# Self Hosting

Self-hosted delivery uses a single `opentoggl` application image (embedded web + API), plus `postgres` and `redis` dependencies in `docker-compose.yml`.

Release artifacts that must ship together:

- `docker/opentoggl.Dockerfile`
- `docker-compose.yml`
- `.env.self-hosted.example`
- `docs/self-hosting/docker-compose.md`

## Compose Startup and Smoke

1. Create env file: `cp .env.self-hosted.example .env.self-hosted`
2. Start dependencies: `docker compose --env-file .env.self-hosted up -d postgres redis`
3. Reconcile schema using `pgschema` against the same PostgreSQL target:

```bash
set -a
source .env.self-hosted
set +a
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql --auto-approve
```

4. Start runtime: `docker compose --env-file .env.self-hosted up -d opentoggl`
5. Verify readiness and key-path smoke:

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsSI http://localhost:8080/
```

## Upgrade and Rollback

- Upgrade: pull new image + schema files, run `pgschema plan`, run `pgschema apply --auto-approve`, restart `opentoggl`, rerun smoke checks.
- Rollback: revert desired schema SQL and image tag to the target release, rerun `pgschema plan/apply`, restart `opentoggl`, rerun smoke checks.
- Persistent data is in the PostgreSQL volume `opentoggl-postgres-data`.

Detailed operator runbook:

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)

Verification evidence location:

- `docs/testing/evidence/self-hosted/`
- `docs/testing/evidence/self-hosted/2026-03-22-compose-smoke.md`
