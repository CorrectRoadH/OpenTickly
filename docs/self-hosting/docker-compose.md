# Docker Compose Startup (Self-Hosted Baseline)

This document defines the self-hosted packaging/rehearsal/release-smoke path only.

- It does not replace source-based local development (`vp run website#dev` + `air`).
- Self-hosted target shape is one `opentoggl` image (embedded Web + API), plus `postgres` and `redis`.
- `docker compose` is the formal self-hosted delivery path for packaging and smoke verification.

## Release Artifacts

Each release must provide these synchronized artifacts:

- `docker/opentoggl.Dockerfile` (single runtime image build)
- `docker-compose.yml` (self-hosted runtime baseline)
- `.env.self-hosted.example` (required self-hosted env template)
- this runbook (`docs/self-hosting/docker-compose.md`)

## Required Environment

1. Create runtime env:

```bash
cp .env.self-hosted.example .env.self-hosted
```

2. Required compose/runtime env in `.env.self-hosted`:

- `OPENTOGGL_IMAGE`
- `OPENTOGGL_PORT`
- `OPENTOGGL_POSTGRES_DB`
- `OPENTOGGL_POSTGRES_USER`
- `OPENTOGGL_POSTGRES_PASSWORD`
- `OPENTOGGL_POSTGRES_PORT`
- `OPENTOGGL_DATABASE_URL`
- `OPENTOGGL_REDIS_URL`

3. Required `pgschema` env in `.env.self-hosted`:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE`

`PG*` values and `OPENTOGGL_DATABASE_URL` must point at the same PostgreSQL instance.

## Startup, Migration, Init, and Readiness

Canonical order is fixed:

1. Start PostgreSQL and Redis
2. Run `pgschema plan` and `pgschema apply`
3. Start `opentoggl`
4. Verify `/healthz`, `/readyz`, and minimal HTTP smoke

Commands:

```bash
docker compose --env-file .env.self-hosted up -d postgres redis
docker compose --env-file .env.self-hosted ps
```

```bash
set -a
source .env.self-hosted
set +a
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql --auto-approve
```

```bash
docker compose --env-file .env.self-hosted up -d --build opentoggl
docker compose --env-file .env.self-hosted ps
```

Readiness semantics:

- `/healthz`: process is alive
- `/readyz`: PostgreSQL, Redis, schema reconciliation, and required initialization are complete
- bootstrap/init for first-admin flows must run after schema apply, never before

## Smoke Verification

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsSI http://localhost:8080/
```

Minimum smoke pass requires all three commands to succeed.

## Volumes and Persistence

- PostgreSQL persistence: named volume `opentoggl-postgres-data`
- Runtime container itself is stateless

Stop/cleanup:

```bash
docker compose --env-file .env.self-hosted down
```

To also remove PostgreSQL data (destructive):

```bash
docker compose --env-file .env.self-hosted down -v
```

## Upgrade

1. Pull or build the target `OPENTOGGL_IMAGE`.
2. Update `.env.self-hosted` to the target image tag/config.
3. Run `pgschema plan` and review output.
4. Run `pgschema apply --auto-approve`.
5. Restart `opentoggl` with compose.
6. Re-run smoke verification.

## Rollback

Rollback is driven by release artifact state:

1. Revert image tag and desired schema SQL to target release state.
2. Run `pgschema plan` and review rollback diff.
3. Run `pgschema apply --auto-approve`.
4. Restart compose services.
5. Re-run smoke verification.

If rollback includes irreversible schema change, restore from backup per release notes.

## Evidence Path

Runtime and smoke evidence for this baseline is tracked under:

- `docs/testing/evidence/self-hosted/`
- `docs/testing/evidence/self-hosted/2026-03-22-compose-smoke.md`
