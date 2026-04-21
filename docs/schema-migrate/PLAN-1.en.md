**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)

---

## Implementation Plan 1 (Recommended)

### Summary

- Use `goose` + baseline + built-in migrate runner to address versioned migrations, complex DDL/data migrations, self-hosting/Docker/single-binary delivery, and the current schema-snapshot requirement. What it does not solve: large-scale backfill and compatibility windows still require manual design by the team, and `latest.sql` still needs to be maintained or generated.

---

## Core design

### Source-of-truth split

- **Production source of truth**: versioned migration files
- **Current structure snapshot**: `latest.sql`

The two concepts are clearly separated:

- Migrations describe "how to move from the old world to the new world"
- `latest.sql` describes "what the database looks like today"

### Suggested layout

```text
apps/backend/db/migrations/
  00001_baseline.sql
  00002_...
  00003_...

apps/backend/db/schema/
  latest.sql
```

### Initialization and upgrade

- New database: quickly initialize via baseline / latest schema
- Existing database: on startup the application automatically checks and executes unfinished migrations
- Migration history is recorded in the production database
- Goose advisory lock at startup ensures only one instance runs migrations

The current upgrade support boundary must be clearly scoped:

- Support fast-initialization of an empty database via baseline
- Officially support migrating from the state of `v0.0.17` to the new migration system
- `v0.0.17` is the supported bridging starting point from the old world to the versioned-migration world
- Historical versions earlier than `v0.0.17` are not promised automatic upgrades; if this becomes needed in the future, a separate bridging migration and verification evidence must be added

### Self-hosting form

- Docker image contains only the OpenToggl backend binary
- No longer depends on the external `pgschema` CLI
- When the official single binary starts, the application automatically checks and applies pending migrations, then enters the service-ready flow
- Users do not need to invoke a separate migrate command; the startup program itself is the official migration entrypoint
- Migration correctness is guaranteed by development, local testing, CI, and release verification — not offloaded onto end operators running things by hand

### Complex migration strategy

- Simple DDL: SQL migration
- Small-scale data backfill: SQL migration
- Large-scale or complex data migration: Go migration
- Destructive changes default to expand / contract:
  - First add the new structure
  - Release compatibility code
  - Backfill data
  - Switch the read path
  - Finally drop the old structure

### How each kind of change produces schema and migration

#### 1. Purely adding fields / tables / indexes

- **How the schema is produced**:
  - First modify the current target structure definition
  - Update `latest.sql` to reflect the post-change final state
- **How to write the migration**:
  - Create a new SQL migration explicitly writing `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`
- **Data backfill**:
  - If the field can be satisfied by a default value, set the default value directly in the migration
  - If the value needs to be computed from old data, add a separate backfill migration

#### 2. Dropping fields / indexes / tables

- **How the schema is produced**:
  - Remove the corresponding object in the target structure
  - Update `latest.sql` to reflect the final state
- **How to write the migration**:
  - Don't drop and ship new code in one step
  - First release a version of the app that no longer depends on the old structure
  - Then submit the drop migration separately
- **Data backfill**:
  - Drop changes themselves don't backfill
  - If old field data needs to be preserved in the new structure, migration must complete before deletion

#### 3. Field rename

- **How the schema is produced**:
  - `latest.sql` only shows the final renamed field name
- **How to write the migration**:
  - Do not rely on a diff tool to guess the rename
  - Default handling: "add new field -> backfill -> app switches read/write -> drop old field"
  - Even if the database's native `RENAME COLUMN` is confirmed safe, the migration must still be written explicitly — implicit inference is not allowed
- **Data backfill**:
  - Via SQL or Go migration, copy old field values into the new field
  - Within the compatibility window the app handles both old and new fields until backfill completes

#### 4. Same-name field, data-structure change

- **Typical examples**:
  - `text` → `jsonb`
  - `integer` → `bigint`
  - JSON shape changes but the field name doesn't
- **How the schema is produced**:
  - `latest.sql` keeps only the post-change final field definition
- **How to write the migration**:
  - Do not change the type in-place and bet on a single success
  - Recommended flow:
    1. Add a temporary new field, e.g. `foo_v2`
    2. Backfill and validate
    3. App switches to reading/writing `foo_v2`
    4. Drop the old field `foo`
    5. If the original field name must be retained, add a new `foo` or rename `foo_v2 -> foo`
- **Data backfill**:
  - Small scale: use SQL `UPDATE`
  - Large scale or complex conversion: use a Go migration to backfill in batches
  - After backfill completes, verification logic must confirm that old and new field contents are consistent or match expectations

#### 5. Full table rebuild

- **Typical examples**:
  - Primary-key model change
  - Major adjustment of column set
  - Partitioning, constraint, and index strategy redesign
- **How the schema is produced**:
  - `latest.sql` keeps only the new table structure
- **How to write the migration**:
  - Do not apply an implicit diff against the old table
  - Recommended flow:
    1. Create a new table `new_table`
    2. Backfill historical data
    3. App switches writes/reads to the new table
    4. Observe stability, then drop the old table
    5. If the old table name must be reused, explicitly rename afterwards
- **Data backfill**:
  - Use a dedicated migration for bulk copy and conversion
  - Large data volumes must be batched, retryable, and observable

#### 6. JSON / composite data-structure adjustment

- **How the schema is produced**:
  - `latest.sql` reflects the new JSON field constraints, default values, and index strategy
- **How to write the migration**:
  - Separate DDL from data conversion
  - First ensure the new structure is writable, then convert historical JSON
- **Data backfill**:
  - SQL is suited to simple JSONB updates
  - Go migrations are suited to complex structure rewrites, field split/merge, and version-compatible conversions

#### 7. Large-scale data backfill

- **How the schema is produced**:
  - `latest.sql` first reflects the target structure
- **How to write the migration**:
  - Rolling out the new structure and the large backfill are split into at least two steps — not stuffed into one long-transaction SQL migration
  - Use a Go migration or a background job for batched backfill
- **Data backfill**:
  - Must explicitly define batch size, cursor advancement, failure retry, idempotency, and progress logging
  - During backfill the application should remain forward-compatible

### Rules for producing `latest.sql`

- `latest.sql` is not a second source of truth pulled from thin air
- Every time a migration is designed, a synchronized "post-change final schema snapshot" must be produced
- Recommended order:
  1. First design the migration and compatibility steps
  2. Then derive the final structure
  3. Update `latest.sql`
- `latest.sql` describes only the final structure — not temporary states during compatibility phases
- Temporary columns and temporary tables that only serve the migration process and will eventually be removed should not live in `latest.sql` long term

### Basic rules for data backfill

- Small data volume, simple transform: SQL migration
- Large data volume, complex transform: Go migration
- Data backfill is by default decoupled from structure change — don't stuff every step into one migration
- All backfills must be:
  - Retryable
  - As idempotent as possible
  - Observable
  - Batchable
  - Have a completion check

---

## Governance rules that must be defined first

If PLAN-1 is chosen, you cannot simply bring in goose and a migrations directory — the following rules must be nailed down first.

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
- Go migrations may only depend on stable migration helpers, raw SQL, and the controlled database access layer
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
- Already-executed migration files must not be modified; a checksum verification failure must prevent startup

### 7. Testing and verification rule

- CI must at least verify: empty-DB initialization, existing-DB upgrade, `latest.sql` consistency
- For complex migrations, tests must cover the real migration path — not just verify the final schema
- Startup smoke must go through the official path where the official app startup automatically checks/runs migrations — not a test-only bypass
- The self-hosted single-binary path must have independent verification evidence — local-dev evidence cannot substitute
- Existing-DB upgrade verification must at least cover: the state of `v0.0.17` -> current version; earlier versions, if unsupported, must be explicitly declared in docs rather than implicitly assumed
- In multi-branch parallel development, goose's out-of-order capability may be used to apply missed migrations, but this must be explicitly recorded in CI and review

### 8. Rollback and forward-fix rule

- Default to forward-only; down migrations are not the primary production rollback strategy
- High-risk migrations must have a forward-fix strategy written during design
- If a change requires a compatibility window, dual-write, batched backfill, or manual observation, it must be staged; even if these stages are auto-triggered by startup, they must have clear phase boundaries and recovery semantics
- The recovery path after a failed migration must be able to answer: which step did the database stop at, is it retryable, is human intervention needed

These rules are not "documentation details to add later" — they are preconditions for whether PLAN-1 can stand.

---

## How the already-occurring pain points are addressed

Below, each already-occurring pain point recorded in [GOALS.md](GOALS.md) is addressed in turn under this plan.

### FK target change + constraint rewrite + column deletion (`36ad3fc`-class scenario)

The pgschema problem: diff interprets `catalog_groups.workspace_id → organization_id` as drop + recreate, and interprets the CHECK constraint value-set change as drop + add; if old data has the `owner` role value it fails immediately, and the whole process is uncontrolled.

Handling under goose: split into multiple explicit migration steps.

```sql
-- 00002_groups_to_org.sql

-- 1. Add new column
ALTER TABLE catalog_groups ADD COLUMN organization_id bigint;

-- 2. Backfill: trace organization back through workspace
UPDATE catalog_groups g
SET organization_id = w.organization_id
FROM tenant_workspaces w
WHERE g.workspace_id = w.id;

-- 3. Set NOT NULL + FK
ALTER TABLE catalog_groups
  ALTER COLUMN organization_id SET NOT NULL,
  ADD CONSTRAINT catalog_groups_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES tenant_organizations (id) ON DELETE CASCADE;

-- 4. Drop old column and old index
DROP INDEX catalog_groups_workspace_id_idx;
ALTER TABLE catalog_groups DROP COLUMN workspace_id;

-- 5. Create new indexes
CREATE INDEX catalog_groups_organization_id_idx ON catalog_groups (organization_id);
CREATE UNIQUE INDEX catalog_groups_organization_name_key ON catalog_groups (organization_id, lower(name));
```

CHECK constraint change is analogous:

```sql
-- Change the constraint first (can be one-step when there's no data conflict)
ALTER TABLE membership_workspace_members
  DROP CONSTRAINT membership_workspace_members_role_check,
  ADD CONSTRAINT membership_workspace_members_role_check
    CHECK (role IN ('admin', 'member', 'projectlead', 'teamlead'));

-- If old data has 'owner' values, backfill first
UPDATE membership_workspace_members SET role = 'admin' WHERE role = 'owner';
```

Each step is explicit, reviewable, and in code review you can see "how the middle is migrated".

### Table rebuild (`9a508b2`-class scenario)

The pgschema problem: `onboarding_progress` → `user_onboarding` both show up in the diff as drop + create, making it impossible to distinguish "intentionally discarded" from "accidentally lost".

Handling under goose depends on whether data must be preserved:

**Data not retained** (like `9a508b2` onboarding business refactor):

```sql
-- 00003_onboarding_rebuild.sql

DROP TABLE onboarding_progress;

CREATE TABLE user_onboarding (
    user_id bigint PRIMARY KEY REFERENCES identity_users (id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);
```

The migration file explicitly writes DROP; code review can confirm "this is intentionally discarding data".

**Data retained** (suppose onboarding refactor but completed state needs to migrate):

```sql
-- 00003_onboarding_rebuild.sql

-- 1. Create new table
CREATE TABLE user_onboarding (
    user_id bigint PRIMARY KEY REFERENCES identity_users (id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);

-- 2. Migrate old data
INSERT INTO user_onboarding (user_id, completed_at)
SELECT DISTINCT user_id, now()
FROM onboarding_progress
WHERE dismissed = true
ON CONFLICT DO NOTHING;

-- 3. Drop old table
DROP TABLE onboarding_progress;
```

Key difference: the two scenarios look identical in a pgschema diff, but their intent is completely different in the migration file — and code review can distinguish them.

### Same-name field, data-structure change (`81abf94`-class scenario)

The pgschema problem: `tag_ids jsonb` → `tag_ids bigint[]`, the diff attempts `ALTER COLUMN ... TYPE bigint[]`, but jsonb cannot be implicitly cast to a bigint array, so it fails immediately when data is present. The desired-state model cannot express the data conversion process.

Handling under goose has two variants:

**Data not retained** (e.g. the field has no production data yet, or the business confirms it can be discarded):

```sql
-- 00004_array_columns_no_data.sql

-- Change type directly, DROP DEFAULT then reset
ALTER TABLE tracking_time_entries
  ALTER COLUMN tag_ids DROP DEFAULT,
  ALTER COLUMN tag_ids TYPE bigint[] USING '{}',
  ALTER COLUMN tag_ids SET DEFAULT '{}';

-- Repeat the same for other tables' jsonb → bigint[] fields
ALTER TABLE tracking_favorites ...;
ALTER TABLE tracking_goals ...;
ALTER TABLE tracking_reminders ...;
```

`USING '{}'` in the migration file explicitly expresses "discard old data, set to empty array"; reviewers can confirm the intent.

**Data retained** (production has data; need to convert `[1,2,3]` JSON → `{1,2,3}` pg array):

```sql
-- 00004_array_columns_with_data.sql

-- 1. Add temporary column
ALTER TABLE tracking_time_entries ADD COLUMN tag_ids_new bigint[] NOT NULL DEFAULT '{}';

-- 2. Backfill: jsonb array → pg array
UPDATE tracking_time_entries
SET tag_ids_new = ARRAY(SELECT jsonb_array_elements_text(tag_ids)::bigint)
WHERE tag_ids != '[]'::jsonb;

-- 3. Swap
ALTER TABLE tracking_time_entries DROP COLUMN tag_ids;
ALTER TABLE tracking_time_entries RENAME COLUMN tag_ids_new TO tag_ids;
```

Key difference: the two scenarios look identical in a pgschema diff (final state is `bigint[]`), but the intent and data-handling strategy in the migration file are completely different — and code review can distinguish "intentional discard" from "safe conversion".

---

## Advantages

- **Satisfies single schema source-of-truth goal**: corresponds to "single schema source of truth" in [GOALS.md](GOALS.md); a single `latest.sql` is retained as the current structure snapshot, letting humans and AIs quickly understand the database structure
- **Satisfies supporting complex migrations goal**: corresponds to "support complex migrations" in [GOALS.md](GOALS.md); no longer relies on runtime diff inference — table rebuilds, field refactors, data backfill, and compatibility-window migrations can be written explicitly
- **Satisfies self-hosting delivery goal**: corresponds to "adapt to self-hosting delivery" in [GOALS.md](GOALS.md); can be packaged into a single Go binary, without hard dependency on an external schema tool
- **Satisfies Docker / single-binary unified-path goal**: corresponds to "adapt to self-hosting delivery" in [GOALS.md](GOALS.md); the entrypoint only needs to run the app's own migrate command
- **Satisfies test-path consistent with production-path goal**: corresponds to "test path consistent with production path" in [GOALS.md](GOALS.md); the test DB can go through the same migration mechanism as production
- **Satisfies versioned and reviewable goal**: corresponds to "versioned and reviewable" in [GOALS.md](GOALS.md); the DB can answer which step it's currently at, and code review can see the concrete migration
- **Satisfies new-DB init and existing-DB upgrade goal**: corresponds to "both new-DB init and existing-DB upgrade must be simple" in [GOALS.md](GOALS.md); baseline + incremental migrations cover both
- **Fits the existing backend stack**: not a standalone `GOALS.md` goal, but OpenToggl is a Go backend, and `goose`'s SQL/Go dual mode matches the current engineering form

---

## Disadvantages

- **Heavier workflow than now**: corresponds to `goose`'s "default source of truth is the migration history, not a single schema SQL" in [LIMITS.md](LIMITS.md); developers and AI no longer just edit a single `schema.sql`
- **Must maintain a snapshot file**: corresponds to `goose`'s "team needs to maintain an additional `latest.sql` snapshot" in [LIMITS.md](LIMITS.md); otherwise the current structure snapshot will drift from the migrations
- **Not an automation silver bullet**: corresponds to `goose`'s "still won't automatically solve large-table backfill, compatibility windows, or dual-write cutover launch-design problems" in [LIMITS.md](LIMITS.md)
- **Requires a one-time switchover cost**: corresponds to `pgschema`'s "tests, entrypoint, and deployment all become coupled to the external `pgschema` tool" in [LIMITS.md](LIMITS.md); migrating to `goose` is therefore not a small patch
- **Still requires team discipline**: corresponds to `goose`'s "if team discipline is insufficient, migrations and the snapshot file will drift" in [LIMITS.md](LIMITS.md)

---

## Conclusion

OpenToggl's database schema / migrate mechanism should move from "`pgschema` target-state apply" to:

- `goose` handles versioned migration execution
- `latest.sql` handles the current schema snapshot
- The OpenToggl binary has a built-in migration runner
- Docker / single-binary self-hosting all use the same migrate path

This plan is not the lightest, but it best fits OpenToggl's current real constraints: the schema is still changing quickly, complex migrations are unavoidable, and it must serve self-hosting delivery.
