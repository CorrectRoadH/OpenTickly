**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)

---

## Implementation Plan 4

### Summary

- Use `tern` (native pgx migration runner) + baseline + built-in migrate runner to address versioned migrations, complex DDL/data migrations, self-hosting/Docker/single-binary delivery, and current schema-snapshot needs. Solves the same set of problems as PLAN-1 (goose); the core difference is that tern directly uses `*pgx.Conn` (OpenToggl's existing driver) and has a built-in advisory lock.

---

## Core design

### Source-of-truth split

Same as PLAN-1:

- **Production source of truth**: versioned migration files
- **Current structure snapshot**: `latest.sql`

### Suggested layout

```text
apps/backend/db/migrations/
  001_baseline.sql
  002_...
  003_...

apps/backend/db/schema/
  latest.sql
```

### Key differences vs PLAN-1

| Dimension | PLAN-1 (goose) | PLAN-4 (tern) |
|------|----------------|----------------|
| Database driver | `database/sql` or requires a pgx adapter layer | Directly accepts `*pgx.Conn`, zero adaptation |
| advisory lock | Not built-in; need to add `pg_advisory_lock/unlock` before/after migrate yourself | Built-in; automatically acquired before migrate and released after |
| Go migration | Register Go function via `goose.AddMigrationNoTxContext` | `UpFunc`/`DownFunc` callbacks receive `*pgx.Conn` |
| Migration file format | SQL files + Go files, sorted by numeric prefix | SQL files (supports `tern` template syntax), Go callbacks registered via code |
| embed support | `embed.FS` | `fs.FS` (compatible with `embed.FS`) |
| Community size | Larger (5k+ stars), more docs | Smaller (~900 stars), fewer docs, but author is pgx author jackc |
| Version table | `goose_db_version` | `public.schema_version` (configurable) |
| Template syntax | None | Supports Go template syntax; conditional logic usable inside SQL migrations |

### Integration approach

tern is integrated as a Go library into the OpenToggl binary:

```go
import (
    "embed"
    "github.com/jackc/tern/v2/migrate"
    "github.com/jackc/pgx/v5"
)

//go:embed db/migrations/*.sql
var migrationFS embed.FS

func runMigrations(conn *pgx.Conn) error {
    migrator, err := migrate.NewMigrator(ctx, conn, "schema_version")
    if err != nil {
        return err
    }
    err = migrator.LoadMigrations(migrationFS)
    if err != nil {
        return err
    }
    return migrator.Migrate(ctx) // built-in advisory lock
}
```

Compared to goose integration: goose needs a `*sql.DB` or bridging via the pgx stdlib adapter; tern directly uses the existing `*pgx.Conn`.

### Initialization and upgrade

- New database: quickly initialize via baseline migration (001_baseline.sql contains the full current schema)
- Existing database: `migrator.Migrate(ctx)` runs unfinished migrations
- The `schema_version` table in the production DB records migration history
- In multi-replica deployment, tern coordinates automatically via advisory lock; only one instance runs migrate

The current upgrade support boundary must be clearly scoped:

- Officially supports migrating from the state of `v0.0.17` to the new migration system
- `v0.0.17` is the supported bridging starting point from the old world to the new migration world
- Historical versions earlier than `v0.0.17` are not promised automatic upgrades; if future support is needed, a separate bridging migration and verification evidence must be added

### Self-hosting form

Same as PLAN-1:

- The Docker image contains only the OpenToggl backend binary
- No longer depends on the external `pgschema` CLI
- When the official single binary starts, the application automatically checks and applies pending migrations, then enters the service-ready flow
- Users do not need to invoke a separate migrate command; the startup program itself is the official migration entrypoint
- Migration correctness is guaranteed by development, local testing, CI, and release verification — not offloaded to end operators

### Complex migration strategy

Same as PLAN-1:

- Simple DDL: SQL migration
- Small-scale data backfill: SQL migration
- Large-scale or complex data migration: Go migration (registered via `UpFunc`, receiving `*pgx.Conn`)
- Destructive changes default to expand / contract

### How each kind of change produces schema and migration

Same as PLAN-1; not repeated here. See [PLAN-1.md §How each kind of change produces schema and migration](PLAN-1.md).

### Rules for producing `latest.sql`

Same as PLAN-1. See [PLAN-1.md §Rules for producing `latest.sql`](PLAN-1.md).

### Basic rules for data backfill

Same as PLAN-1. See [PLAN-1.md §Basic rules for data backfill](PLAN-1.md).

---

## How the already-occurring pain points are addressed

Same as PLAN-1 — tern and goose have equivalent expressive power at the migration-file layer: both are explicit SQL + optional Go migration. See concrete examples in [PLAN-1.md §How the already-occurring pain points are addressed](PLAN-1.md).

The only difference: in a Go migration, tern's callback receives `*pgx.Conn` directly, so pgx's `CopyFrom`, `SendBatch`, and other high-performance APIs can be used for bulk data migration without going through a `database/sql` adapter layer.

---

## Advantages

- **Satisfies all GOALS requirements**: same as PLAN-1; covers single schema source-of-truth, complex migrations, self-hosting, versioning, consistent test path, forward-fix
- **Zero driver adaptation**: OpenToggl already uses pgx v5; tern directly accepts `*pgx.Conn`, no `database/sql` bridge or pgx stdlib adapter needed
- **Built-in advisory lock**: multi-replica deployment is safe out of the box; no need to wrap locking logic around migrate code
- **More natural Go migrations**: the `UpFunc` callback receives a pgx conn directly, so existing pgx query patterns in the project can be used without learning another API
- **Template syntax**: Go templates in SQL migrations allow conditional logic (e.g. `{{ if .IsDev }}` to skip some steps), useful for dev/prod branching
- **Lighter dependencies**: tern itself is small, with few transitive dependencies

---

## Disadvantages

- **Smaller community**: corresponds to tern's community-size limit in [LIMITS.md](LIMITS.md); goose has more docs, issue answers, and third-party integration examples
- **Heavier workflow than now**: same as PLAN-1; developers no longer just edit a single `schema.sql`
- **Must maintain a snapshot file**: same as PLAN-1; `latest.sql` needs manual sync
- **Not an automation silver bullet**: same as PLAN-1; large-table backfill and compatibility windows still require manual team design
- **Requires a one-time switchover cost**: same as PLAN-1; every place coupled to pgschema needs to change
- **Template syntax is double-edged**: if abused, readability of SQL migrations drops
- **Built-in runner still needs team-supplied ops semantics**: tern only solves the migration executor itself; it won't define baseline, upgrade, failure reporting, status queries, pending-migration display, CI verification, or `latest.sql` drift detection for OpenToggl
- **Built-in advisory lock is not a decisive advantage**: it removes one layer of wrapping, but the lock itself isn't the hardest problem in the migration system; don't overrate it as the core selection driver
- **Native pgx integration also creates stronger coupling**: receiving `*pgx.Conn` directly in Go migrations is convenient, but makes it easier for historical migrations to depend on the project's current implementation habits, raising future refactor compatibility risk
- **Go migrations need strict boundaries**: if migration code directly depends on the current application/domain implementation, historical migrations destabilize as the business code evolves; tern won't prevent this rot automatically
- **`latest.sql` drift risk still exists**: without CI or generation verification, the migration source of truth and the current-state snapshot easily diverge long-term and form a second source of truth
- **Baseline strategy needs extra governance**: when baseline can be re-cut, whether old environments never go through baseline or may switch by version, how baseline and subsequent migrations keep clear boundaries — neither docs nor tooling will decide this for the team
- **Running migrations at startup has its own boundary**: a single binary and entrypoint can run migrate, but that doesn't mean all migrations suit being bound to pre-startup; long backfills, high-risk migrations, and steps needing human observation should still be split into separate commands or background jobs

---

## Choice judgment vs PLAN-1

PLAN-1 and PLAN-4 solve exactly the same problem; the difference is engineering fit:

- Pick **PLAN-1 (goose)** if: you value community size, docs richness, and being able to Google an answer when issues arise
- Pick **PLAN-4 (tern)** if: you value zero-friction integration with the existing pgx stack, built-in advisory lock, and lighter dependencies

But be clear:

- Both are roughly equivalent in migration-file expressive power; differences are mostly integration style and ecosystem maturity
- `PLAN-4`'s advantage is more about engineering fit, not a capability gap
- If the team is more worried about custom runner constraints getting loose, historical migration rot, or lacking ready-made experience during later maintenance, `PLAN-1` may actually be more stable

---

## Governance rules that must be defined first

If PLAN-4 is chosen, you cannot simply bring in tern and a migrations directory — the following rules must be nailed down first.

### 1. Runner-boundary rule

- The built-in application migration runner must be the sole official migration execution boundary
- The official `serve` command must automatically check and apply pending migrations at startup; this must be uniform official behavior and cannot drift between different run forms
- Startup logs or diagnostic output must contain at least: current version, pending migrations, execution result, and failure location
- There must be an official `status` capability that can answer which version the database is at and which migrations are still pending

### 2. Baseline rule

- Baseline only serves new-database initialization, not existing-environment upgrades
- Existing-environment upgrades must only go through incremental migrations; they cannot revert to the baseline path mid-way
- When re-cutting the baseline is allowed must follow a clear rule, e.g. only at official release points or major-version switches
- Every re-cut of the baseline must re-verify the full initialization path from empty DB to current version
- The supported old-version upgrade starting point must be explicitly hardcoded; the current bridging starting point is defined as `v0.0.17`, and earlier versions are not supported by default

### 3. `latest.sql` rule

- Migration files are the execution source of truth; `latest.sql` is only the current structure snapshot
- `latest.sql` must be generated or verified by a controlled process — it cannot fully rely on human sync
- CI must verify that `latest.sql` matches the final structure after migrations run
- If they differ, the merge must fail — "merge first, fix the snapshot later" is not acceptable

### 4. Go-migration boundary rule

- Go migrations must not depend on the current implementation of application, domain, or transport
- Go migrations may only depend on stable migration helpers, raw SQL, and the controlled pgx access layer
- Historical migrations must remain compilable and executable after future removal of business modules, service refactors, or domain model adjustments
- Go migrations are only used when batching, retries, observation, or complex conversion is genuinely required; simple structure changes still default to SQL migrations

### 5. Pre-startup execution rule

- When the official version starts, it must automatically check and apply pending migrations — this includes long-running migrations; automation is an official requirement, not dependent on operator intervention
- But long-running migrations must not be written as "unobservable black-box startup freezes"; they must have stages, progress, failure location, and recovery semantics
- Long-running backfills or data conversions must be designed to be resumable, retryable, and able to tell which stage is current — not a single non-interruptible large transaction
- If some migration significantly extends startup time, this must be explicitly surfaced in logs, status output, or ops docs — not a silent wait
- Self-hosted docs must make clear: which migrations official startup automatically runs, how the instance behaves during long migrations, and how to recover from failure

### 6. Review rule

- Every schema change must simultaneously submit: the migration file, the `latest.sql` update, and any necessary rollout/compat notes
- Destructive changes must be explicitly annotated as "data not retained" or "data retained"
- For expand/contract changes, review must clearly lay out phase boundaries — not just the final schema result
- "Change the DB by hand first, then have the repo catch up" is not acceptable

### 7. Testing and verification rule

- CI must at least verify: empty-DB initialization, existing-DB upgrade, `latest.sql` consistency
- For complex migrations, tests must cover the real migration path — not just verify the final schema
- Startup smoke must go through the official path where the official app startup automatically checks/runs migrations — not a test-only bypass
- The self-hosted single-binary path must have independent verification evidence — local-dev evidence cannot substitute
- Existing-DB upgrade verification must at least cover: the state of `v0.0.17` -> current version; earlier versions, if unsupported, must be explicitly declared in docs rather than implicitly assumed

### 8. Rollback and forward-fix rule

- Default to forward-only; down migrations are not the primary production rollback strategy
- High-risk migrations must have a forward-fix strategy written during design
- If a change requires a compatibility window, dual-write, batched backfill, or manual observation, it must be staged; even if these stages are auto-triggered by startup, they must have clear phase boundaries and recovery semantics
- The recovery path after a failed migration must be able to answer: which step did the database stop at, is it retryable, is human intervention needed

These rules are not "documentation details to add later" — they are preconditions for whether PLAN-4 can stand.

---

## Conclusion

tern is a same-class alternative to PLAN-1; the core difference is stack affinity: native pgx conn, built-in advisory lock, lighter dependencies. It fits a project shape like OpenToggl — "already full-stack pgx, needs single-binary built-in migrate".

The current version support boundary is recommended to be explicitly written as:

- Supports empty-DB initialization
- Supports upgrade from the state of `v0.0.17`
- Historical versions earlier than `v0.0.17` do not have automatic upgrade promised for now
