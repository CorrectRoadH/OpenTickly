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

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)
- Self-hosted target is a single `opentoggl` Go runtime image (not `website + api` dual runtime).
- Existing split-runtime Docker artifacts in the repository are implementation drift pending cleanup, not target deployment guidance.
- Self-hosted PostgreSQL schema changes are managed through `pgschema`, not handwritten deployment SQL.
