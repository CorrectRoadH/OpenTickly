**Related docs**:
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## Goals

This document records the goals that OpenToggl's database schema / migrate mechanism must satisfy.
It is organized by goal, does not write specific implementation details, and does not mistake the current state of the code for a goal.

---

## Pain points that have already occurred

The following are real cases OpenToggl has already encountered where the current desired-state apply model struggles to clearly express the migration process:

### FK target change + constraint rewrite + column deletion (`36ad3fc` refactor org api)

- `catalog_groups.workspace_id` FK was changed to an `organization_id` FK, and all old indexes had to be rebuilt
- The CHECK constraint value set on `membership_workspace_members` changed from `owner/admin/member` to `admin/member/projectlead/teamlead`
- The `catalog_groups.has_users` column was deleted
- These kinds of diffs often involve drop/recreate, constraint rebuilds, and destructive deletions; if old data is incompatible, execution risk is high, and code review cannot see the migration intent from the final schema alone

### Table rebuild without retaining data (`9a508b2` refactor onboarding)

- `onboarding_progress` (composite primary key, 4 columns) was entirely replaced with `user_onboarding` (single-column primary key, 3 columns, a completely different column set)
- This is a business refactor; old data does not need to be retained, and drop + create is the correct behavior
- The current desired-state model can express the final state but cannot naturally distinguish "intentionally discarding data" from "accidentally omitting data migration"
- If a similar table rebuild ever needs to retain data, an additional mechanism is required to explicitly express the migration process and retention strategy

### Same-named field, data structure change (`81abf94` refactor: eliminate unnecessary type conversions)

- Array fields on multiple tables were changed from `jsonb` to `bigint[]`:
  - `tracking_time_entries.tag_ids`: `jsonb` → `bigint[]`
  - `tracking_time_entries.expense_ids`: `jsonb` → `bigint[]`
  - `tracking_favorites.tag_ids`: `jsonb` → `bigint[]`
  - `tracking_goals.project_ids`, `task_ids`, `tag_ids`: `jsonb` → `bigint[]`
  - `tracking_reminders.user_ids`, `group_ids`: `jsonb` → `bigint[]`
- The field names are unchanged, but the underlying storage types are completely different, and the old data format (`[1,2,3]` JSON array) is incompatible with the new type (`{1,2,3}` pg array)
- An in-place type change can easily fail or require manual conversion logic if the column already has data
- A safer approach is usually: add a temporary column → convert data → drop the old column → rename the new column; this shows the system needs to express the migration process explicitly, not just the final state

These are not hypothetical scenarios — they are problems that actually occurred in recent commit history.

---

## Requirements

### The current structure must have a stable representation

- The repository must contain a stable, easily-readable representation of "what the database looks like now" so that humans and AIs can quickly understand the current structure while developing
- This representation must be able to clearly answer "which tables, columns, indexes, and constraints exist now", not require manually replaying all historical changes to infer
- The current-structure representation must stay consistent with the official execution path; it must not drift for long into a separate source of truth

### Support complex migrations

- The schema mechanism must support complex evolution, not just simple changes like "add a column, add a table"
- AI or developers changing features may:
  - Rebuild an entire table
  - Change a field type or data structure
  - Split / merge columns
  - Add or remove fields, indexes, constraints
  - Perform data backfill, cleaning, or compatibility-window migrations
- The migration system must be able to express "process", not just the final target state
- Complex DDL and data migrations must be executable in a controlled way, reviewable, and verifiable, without depending on a diff tool to infer at runtime

### Adapt to self-hosting delivery

- The self-hosted deployment path should not require the operator to manually orchestrate extra schema steps to complete deployment
- The Docker image should automatically perform a controlled schema reconcile / migrate before the application starts
- A single backend binary must be able to perform controlled schema execution — this is an official functional requirement
- The same mechanism must apply to all of:
  - Local development
  - CI / startup smoke
  - Docker / compose
  - Self-hosted single-binary deployment

### Versioned and reviewable

- The schema change process must exist in the repository under version control
- Every database change should be visible in code review as "what will this do to the database", not only as the final SQL after the change
- The production database must have a clear execution history or state record that can answer "which step is the current database at"

### Both new-database initialization and existing-database upgrade must be simple

- New-environment initialization should be fast enough, simple enough, and repeatable enough; high-cost historical replay cannot be the only realistic path
- New databases should have a clear, stable initialization path
- Existing environments should be able to safely upgrade from the current version to the target version
- The officially supported upgrade starting point must be explicitly declared; currently this can be defined as "supports upgrading from the state of `v0.0.17` to the new migration system", with earlier versions not promised automatic upgrades

### Test path consistent with production path

- Test database initialization must not continue along a completely different schema-apply path from production
- The test environment should reuse the real migration mechanism as much as possible to avoid "tests pass, production migrate fails"

### Coupling between schema changes and code changes

- OpenToggl's schema-to-Go mapping is 100% hand-written (pgx + manual Scan), with no ORM or code generation
- A single schema change ripples across 4 layers: infra SQL/scan → application types → application service → transport handler
- The schema-execution mechanism must distinguish two kinds of schema changes:
  - **Data not retained**: business refactor, old tables/columns discarded directly; review can explicitly confirm this is intentional
  - **Data retained**: field type change, table rebuild but data needs migrating; review can clearly see the conversion process and retention strategy
- We cannot guess the intent of these two kinds of changes from the final state alone — the system must explicitly express intent and data-handling strategy

### Forward-fix first

- Default to a forward-only database evolution model
- Do not treat down migrations as the primary production rollback strategy
- High-risk changes must be staged ahead of time, with compatibility windows and data recovery mechanisms retained
