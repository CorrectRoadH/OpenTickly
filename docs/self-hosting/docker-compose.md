# Docker Compose Startup (Target Shape)

This document defines the self-hosted runtime path only.

- It does not define the default local development workflow.
- Local development should run source processes directly from the repository root.
- Local development environment variables belong in the repository root.
- Root-level local env files such as `.env.example` and `.env.local` remain the source of truth for source-based development.
- Root `.env.local` is required for source-based local development; `.env.local.example` is only a template.
- Source-based local backend startup must fail if required datasource env is missing instead of falling back to in-memory behavior.

## Services

- `opentoggl`: single Go runtime serving embedded Web assets and HTTP API on `http://localhost:8080`
- `postgres`: PostgreSQL 16
- `redis`: Redis 7

Self-hosted delivery should default to one application image:

- build `apps/website`
- embed the built frontend assets into the Go backend binary
- serve SPA routes and `/web/v1/*` from the same Go runtime

`docker compose` health checks use `/readyz` for readiness on the single `opentoggl` service.

## PostgreSQL Schema Management

Self-hosted PostgreSQL schema management is standardized on `pgschema`.

- The repository-managed desired schema is the only PostgreSQL schema source of truth.
- Self-hosted deployments must not rely on handwritten one-off DDL, ad hoc `psql` sessions, ORM auto-migrate, or a second migration toolchain.
- The canonical deployment order is: connect database -> `pgschema apply` -> run bootstrap/init guard -> start serving traffic -> report ready on `/readyz`.

`pgschema` command inputs use standard PostgreSQL CLI environment variables:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE`

Application runtime still uses:

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`

These two env surfaces must point at the same PostgreSQL instance.

## Start

```bash
docker compose up -d --build
docker compose ps
```

## Schema Workflow

Schema changes are managed declaratively with `pgschema`:

```bash
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql --auto-approve
```

Rules:

- Review `pgschema plan` output before applying schema changes to any shared environment.
- `docker compose` startup for self-hosted delivery should execute the equivalent of `pgschema apply` before the `opentoggl` runtime is treated as ready.
- First-admin bootstrap/init runs after schema apply, not before.
- A fresh environment is not considered bootstrapped until both schema reconcile and initialization complete successfully.

## Verify

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsSI http://localhost:8080/
```

Expected readiness semantics:

- `/healthz` proves the process is alive
- `/readyz` proves PostgreSQL, Redis, schema reconcile, and required initialization are complete
- readiness must fail if `pgschema apply` failed or bootstrap/init has not completed

## Upgrade

Canonical self-hosted upgrade flow:

1. Pull the new image and updated repository schema files
2. Run `pgschema plan` against the target database and review the plan
3. Run `pgschema apply --auto-approve`
4. Start or restart the `opentoggl` service
5. Verify `/readyz`, `/healthz`, and the minimum smoke path

## Rollback

Rollback is driven by repository state, not by handcrafted SQL snippets:

1. Revert the desired schema SQL to the target release state
2. Regenerate and review the `pgschema plan`
3. Apply the reviewed rollback plan
4. Restart the runtime and verify readiness

If the schema change is destructive or non-reversible, document the required backup/restore procedure alongside the release notes.

## Stop

```bash
docker compose down
```

## Drift Note

If the repository currently contains a separate `website` container or Nginx runtime, treat that as implementation drift to be removed. The target self-hosted shape is a single Go application image, not a `website + api` dual-runtime deployment.
Current examples of this drift may still exist in historical branches or local worktrees (for example, an old dedicated website Dockerfile) and should not be interpreted as the target architecture.
