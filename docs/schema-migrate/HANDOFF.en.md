**Decision doc**: [DECISION.md](DECISION.md)
**Implementation plan**: [PLAN-1.md](PLAN-1.md)

---

## Purpose

This document is the execution handoff for landing PLAN-1 (goose). It translates PLAN-1 from a "design plan" into "what concretely needs to change", so the next executor can start writing code directly.

---

## Current state (what will be replaced)

### pgschema touchpoints in the code

| Touchpoint | File | Purpose |
|------|------|------|
| pgschema binary install | `Dockerfile:22` | `go install github.com/pgplex/pgschema@v1.7.3` |
| pgschema binary copy | `Dockerfile:34` | `COPY --from=builder /out/pgschema /usr/local/bin/pgschema` |
| schema.sql copy | `Dockerfile:35` | `COPY apps/backend/internal/platform/schema/schema.sql /app/schema.sql` |
| entrypoint calling schema-apply | `apps/backend/opentoggl-entrypoint.sh:10-12` | `opentoggl schema-apply` |
| schema-apply command | `apps/backend/main.go:52-56` | `bootstrap.ApplySchemaFromEnvironment()` |
| schema apply implementation | `apps/backend/internal/bootstrap/schema_apply.go` | Calls pgschema reconcile |
| reconcile command builder | `apps/backend/internal/platform/schema/reconcile.go` | Builds the pgschema CLI command |
| reconcile tests | `apps/backend/internal/platform/schema/reconcile_test.go` | reconcile unit tests |
| schema path discovery | `apps/backend/internal/platform/schema/path.go` | `OPENTOGGL_SCHEMA_PATH` or compiled path |
| schema path tests | `apps/backend/internal/platform/schema/path_test.go` | path unit tests |
| schema SQL file | `apps/backend/internal/platform/schema/schema.sql` | 31.6KB target-state DDL |
| test schema apply | `apps/backend/internal/testsupport/pgtest/pgtest.go:141-166` | Reads schema.sql and Execs directly |
| env vars | `.env.local` / `.env.example` | `OPENTOGGL_SCHEMA_PATH`, `OPENTOGGL_SCHEMA_RECONCILE` |

### Current database connection approach

- `pgxpool.New(ctx, DATABASE_URL)` creates the pool, held in `platform.DatabaseHandle`
- All repository layers use `pool.Query/QueryRow/Exec` directly
- pgx version: v5.8.0

### Role of the current schema.sql

- Single schema source of truth (desired-state)
- Test initialization directly `pool.Exec(ctx, schemaSQL)` executes the entire file
- Docker entrypoint aligns via `pgschema apply --file schema.sql`

---

## Target state

### New directory layout

```text
apps/backend/db/
  migrations/
    00001_baseline.sql      ← generated from the current schema.sql
  schema/
    latest.sql              ← current-structure snapshot (initial contents = current schema.sql)
```

### New runtime flow

```
App startup (serve)
  → goose.Up(db, migrationsFS)    // built-in, automatically checks and applies pending migrations
  → start HTTP server
```

There is no longer a `schema-apply` command, no `pgschema` binary, and no separate schema step in the entrypoint.

---

## Execution steps

### Phase 1: Introduce goose + baseline migration

**What to do**:

1. `go get github.com/pressly/goose/v3`
2. Create the `apps/backend/db/migrations/` directory
3. Put the contents of the current `schema.sql` into `00001_baseline.sql` (keep only the up portion)
4. Copy the current `schema.sql` to `apps/backend/db/schema/latest.sql`
5. Use `//go:embed db/migrations/*.sql` to embed the migration files

**What not to do**:

- Do not delete existing pgschema-related code (done in Phase 3)
- Do not change the test path (done in Phase 2)

**Verification**:

- Empty DB + goose up → schema matches current schema.sql
- Existing DB (v0.0.17 schema) + manually insert baseline record into goose_db_version → goose up skips baseline

### Phase 2: Replace the runtime migration path

**What to do**:

1. Create a new `apps/backend/internal/platform/migrate/` package, wrapping goose calls:
   - `Run(ctx, pool)` — obtain a conn from the pool, execute goose up
   - `Status(ctx, pool)` — return current version and pending migrations
2. Modify `bootstrap.NewAppFromEnvironment()` or the `serve` command: call `migrate.Run()` on startup before starting the HTTP server
3. Modify `main.go`:
   - The `serve` command has built-in migration (no separate `schema-apply` needed)
   - Keep the `schema-apply` command marked as deprecated, or remove it directly
4. Modify `opentoggl-entrypoint.sh`: remove the `schema-apply` call, `exec opentoggl serve` directly
5. Modify `Dockerfile`:
   - Remove `go install github.com/pgplex/pgschema@v1.7.3`
   - Remove `COPY --from=builder /out/pgschema /usr/local/bin/pgschema`
   - Remove `COPY apps/backend/internal/platform/schema/schema.sql /app/schema.sql`
   - Migration files are already embedded into the binary via `embed.FS`; no extra COPY needed

**Verification**:

- Docker build → `docker run` → empty DB auto-initializes → HTTP accessible
- Docker build → `docker run` → existing DB auto-skips already-executed migrations → HTTP accessible

### Phase 3: Replace the test path

**What to do**:

1. Modify `pgtest.applySchema()`: change from "read schema.sql and Exec directly" to "call goose up"
2. Delete `platform/schema/path.go` (no longer need to discover schema.sql path)
3. Delete `platform/schema/reconcile.go` and `reconcile_test.go`
4. Delete `bootstrap/schema_apply.go`
5. Delete `platform/schema/schema.sql` (replaced by `db/schema/latest.sql` + `db/migrations/`)
6. Clean up `OPENTOGGL_SCHEMA_PATH` and `OPENTOGGL_SCHEMA_RECONCILE` in `.env.example` and docs

**Verification**:

- `air` starts → local dev works normally
- `go test ./...` → all tests pass
- `vp run test:e2e:website` → E2E passes

### Phase 4: CI + latest.sql verification

**What to do**:

1. Add CI check: empty DB → goose up → pg_dump → diff latest.sql
2. If they differ, CI fails

**Verification**:

- Intentionally make latest.sql and the migrations inconsistent → CI reports an error
- After fix → CI passes

---

## Key code skeleton for goose integration

```go
// apps/backend/internal/platform/migrate/migrate.go
package migrate

import (
    "context"
    "embed"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/jackc/pgx/v5/stdlib"
    "github.com/pressly/goose/v3"
)

//go:embed db/migrations/*.sql
var migrationsFS embed.FS

func Run(ctx context.Context, pool *pgxpool.Pool) error {
    db := stdlib.OpenDBFromPool(pool)
    goose.SetBaseFS(migrationsFS)
    if err := goose.SetDialect("postgres"); err != nil {
        return fmt.Errorf("goose dialect: %w", err)
    }
    if err := goose.UpContext(ctx, db, "db/migrations"); err != nil {
        return fmt.Errorf("goose up: %w", err)
    }
    return nil
}
```

Note: the `embed` path is relative to the path of the Go file containing the `//go:embed` directive. If `migrate.go` is placed in `apps/backend/internal/platform/migrate/`, the migration files need to be in `apps/backend/internal/platform/migrate/db/migrations/`, or the embed declaration needs to be placed higher up. The concrete file organization is decided at implementation time — this is just the skeleton.

---

## Baseline strategy

### New database

- goose up starts from `00001_baseline.sql` and applies all migrations

### Existing database upgrading from v0.0.17

- Manually or via startup logic insert a baseline record into the `goose_db_version` table (version 1, marked as executed)
- goose up skips the baseline and applies subsequent migrations

The specific baseline bridging logic (how to determine whether an existing database already has v0.0.17 schema) needs to be designed during Phase 2 implementation. Recommended approach: check whether the `goose_db_version` table exists; if not, determine whether existing tables (such as `identity_users`) are present, and if so insert the baseline record.

### Databases earlier than v0.0.17

- No automatic upgrade promised
- Explicitly declared in the docs

---

## Risks to watch for

1. **Switching the test path may expose hidden issues**: Currently tests initialize by directly Exec'ing schema.sql; after switching to goose up, any problem in a migration will surface immediately. This is a good thing but may increase short-term fix workload.

2. **embed.FS path organization**: Go's `//go:embed` can only embed files in the current package or a subdirectory. The physical location of the migrations directory must match the package where the embed is declared.

3. **Baseline bridging for existing databases**: This is the most error-prone spot. Phase 2 must have clear detection logic and test coverage.

4. **CLAUDE.md must be updated in sync**: It currently says "PostgreSQL schema via `pgschema` only. No second migration toolchain.". After the switch is complete, this must be updated to the goose-related rules.

---

## Completion markers

- [ ] `go.mod` contains `github.com/pressly/goose/v3`
- [ ] `apps/backend/db/migrations/00001_baseline.sql` exists
- [ ] `apps/backend/db/schema/latest.sql` exists
- [ ] `serve` automatically runs migrations at startup
- [ ] `schema-apply` command and pgschema binary removed
- [ ] Dockerfile no longer installs or copies pgschema
- [ ] Entrypoint no longer calls schema-apply
- [ ] Tests initialize via goose up instead of directly Exec'ing schema.sql
- [ ] CI verifies consistency between latest.sql and migrations
- [ ] pgschema-related rules in CLAUDE.md have been updated
- [ ] `platform/schema/reconcile.go`, `path.go`, `schema.sql`, and `bootstrap/schema_apply.go` have been deleted
