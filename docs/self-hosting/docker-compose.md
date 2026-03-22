# Docker Compose Startup (Self-Hosted Baseline)

This document defines the self-hosted packaging/rehearsal/release-smoke path only.

- It does not replace source-based local development (`vp run website#dev` + `air`).
- Self-hosted target shape is one `opentoggl` image (embedded Web + API), plus `postgres` and `redis`.
- `docker compose` is the formal self-hosted delivery path for packaging and smoke verification.

## Release Artifacts

Each release must provide these synchronized artifacts:

- `docker/opentoggl.Dockerfile` (single runtime image build)
- `docker-compose.yml` (self-hosted runtime baseline)
- this runbook (`docs/self-hosting/docker-compose.md`)

## Required Environment

The committed self-hosted baseline is directly usable from `docker-compose.yml` with no required env template.

Baseline defaults shipped in compose:

- `OPENTOGGL_IMAGE=opentoggl:local`
- `OPENTOGGL_PORT=8080`
- `OPENTOGGL_POSTGRES_DB=opentoggl`
- `OPENTOGGL_POSTGRES_USER=postgres`
- `OPENTOGGL_POSTGRES_PASSWORD=postgres`
- `OPENTOGGL_POSTGRES_PORT=5432`
- `OPENTOGGL_DATABASE_URL=postgres://postgres:postgres@postgres:5432/opentoggl?sslmode=disable`
- `OPENTOGGL_REDIS_URL=redis://redis:6379/0`

Operator overrides are optional. Use host env vars or an operator-managed env file (for example `.env.self-hosted`, not shipped as a required artifact).

For `pgschema`, export these standard PostgreSQL CLI vars against the same database as `OPENTOGGL_DATABASE_URL`:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE`

## Startup, Migration, Init, and Readiness

Canonical order is fixed:

1. Start PostgreSQL and Redis
2. Run `pgschema plan` and `pgschema apply`
3. Start `opentoggl`
4. Verify `/healthz`, `/readyz`, and minimal HTTP smoke

Commands:

```bash
docker compose up -d postgres redis
docker compose ps
```

```bash
PGHOST=127.0.0.1 \
PGPORT=5432 \
PGDATABASE=opentoggl \
PGUSER=postgres \
PGPASSWORD=postgres \
PGSSLMODE=disable \
pgschema plan --file apps/backend/internal/platform/schema/schema.sql

PGHOST=127.0.0.1 \
PGPORT=5432 \
PGDATABASE=opentoggl \
PGUSER=postgres \
PGPASSWORD=postgres \
PGSSLMODE=disable \
pgschema apply --file apps/backend/internal/platform/schema/schema.sql --auto-approve
```

```bash
docker compose up -d --build opentoggl
docker compose ps
```

If `5432` is already in use on your host, set `OPENTOGGL_POSTGRES_PORT` and matching `PGPORT` explicitly for that run.

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
docker compose down
```

To also remove PostgreSQL data (destructive):

```bash
docker compose down -v
```

## Upgrade

1. Pull or build the target `OPENTOGGL_IMAGE`.
2. Update runtime config with env overrides if needed (for example `OPENTOGGL_IMAGE`).
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
