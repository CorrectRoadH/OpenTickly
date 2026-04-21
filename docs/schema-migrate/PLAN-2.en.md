**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)

---

## Implementation Plan 2

### Summary

- Use `Atlas` + versioned migrations + a built-in migrate runner to address the single target schema, schema diff/lint, versioned migrations, and self-hosting/Docker/single-binary delivery requirements. What it does not solve: complex data migrations and compatibility windows still require hand-written logic, and the overall adoption cost is higher than `goose`.

---

## Core design

### Source-of-truth split

- **Target schema source of truth**: declarative schema file or controlled SQL schema
- **Production execution source of truth**: versioned migration files
- **Runtime snapshot**: exportable `latest.sql`

### Suggested layout

```text
apps/backend/db/schema/
  desired.sql
  latest.sql

apps/backend/db/migrations/
  00001_baseline.sql
  00002_...
  00003_...
```

### Workflow

- Modify the target schema
- Use `Atlas` to generate a migration draft
- Human review and commit the migration
- At runtime, still execute migrations via the built-in migrate runner
- Official single-binary startup: the OpenToggl binary automatically checks and applies pending migrations

### Self-hosting and upgrade support boundary

- When the official version starts, the application automatically checks and applies pending migrations; users do not need to call a separate migrate command
- Migration correctness is guaranteed by development, local testing, CI, and release verification — not offloaded to end operators running things by hand
- Supports empty-DB initialization to the current schema
- Officially supports migrating from the state of `v0.0.17` to the new migration system
- `v0.0.17` is the supported bridging starting point from the old world to the new migration world
- Historical versions earlier than `v0.0.17` are not promised automatic upgrades; if future support is needed, a separate bridging migration and verification evidence must be added

### How each kind of change produces schema and migration

#### Basic rule

- The target structure is first expressed in the declarative schema
- `Atlas` only generates migration drafts — it does not replace human design of complex migrations
- What is committed to the repo is the human-reviewed migration file

#### 1. Purely adding fields / tables / indexes

- First modify the target schema
- Use `Atlas` to generate the migration draft
- Commit after review
- `latest.sql` is synced to the post-change state

#### 2. Dropping fields / indexes / tables

- First remove from the target schema
- `Atlas` generates a drop draft
- But still requires human confirmation that the app no longer depends on the old structure before execution
- `latest.sql` only keeps the final state

#### 3. Field rename / same-name structure change / table rebuild

- Cannot directly trust the auto-diff result
- Humans must rewrite the change into a staged migration:
  - Add new structure
  - Backfill
  - Switch traffic
  - Drop old structure
- The target schema and `latest.sql` only show the final structure

#### 4. Data backfill

- Simple backfill: add SQL by hand on top of the generated SQL migration
- Complex backfill: add a separate Go migration or background job
- `Atlas` does not design the backfill strategy — it only helps produce the structural-change draft

### Rules for producing `latest.sql`

- Exported from the final target schema
- Does not record temporary columns / temporary tables that exist during the migration compatibility window
- Only expresses the final stable structure

### Applicable focus

- Want to maintain a stricter declarative schema long-term
- Want drift detection, lint, and automated checks
- Want tool-assisted migration generation instead of fully hand-written

---

## Advantages

- **Partially satisfies single schema source-of-truth goal**: corresponds to "single schema source of truth" in [GOALS.md](GOALS.md); the declarative schema expresses "what is the current target structure" more clearly
- **Partially satisfies versioned and reviewable goal**: corresponds to "versioned and reviewable" in [GOALS.md](GOALS.md); can generate versioned migration drafts and enter code review
- **Partially satisfies self-hosting delivery goal**: corresponds to "adapt to self-hosting delivery" in [GOALS.md](GOALS.md); runtime can still use the built-in migrate runner to serve Docker and single-binary delivery
- **Strengthens long-term schema governance**: not a standalone `GOALS.md` goal, but diff, lint, and drift detection are stronger for multi-person collaboration and long-term evolution
- **More systematic snapshot and target-structure management**: not a standalone `GOALS.md` goal, but better suited for long-term maintenance of the target schema and final snapshots

---

## Disadvantages

- **Heavier adoption**: corresponds to `Atlas`'s "adoption cost higher than `goose`, more concepts" in [LIMITS.md](LIMITS.md)
- **Complex migrations still hand-written**: corresponds to `Atlas`'s "complex data migrations still have to be hand-written in the end" in [LIMITS.md](LIMITS.md)
- **Higher switchover cost**: corresponds to `Atlas`'s "as a first-step replacement for `pgschema`, it is heavy" in [LIMITS.md](LIMITS.md), because it introduces two layers of change — schema management and migration management — simultaneously
- **Easy to overestimate the value of auto-generation**: corresponds to `Atlas`'s "the current core problem isn't missing schema diff but missing an explicit, controllable migration process" in [LIMITS.md](LIMITS.md)

---

## How the already-occurring pain points are addressed

### FK target change + constraint rewrite + column deletion (`36ad3fc`-class scenario)

- Atlas's diff engine can identify FK target changes and CHECK constraint changes and generate a migration draft
- But the draft still defaults to `ALTER COLUMN` / `DROP CONSTRAINT` + `ADD CONSTRAINT` and does not automatically handle old-data incompatibility
- The draft still needs human review and must be rewritten into a staged migration (add new column → backfill → drop old column)
- Difference from goose: Atlas can auto-generate a starting draft, while goose needs fully hand-written migrations — but in complex scenarios both ultimately require human design

### Table rebuild (`9a508b2`-class scenario)

- **Data not retained**: Atlas diff generates `DROP TABLE` + `CREATE TABLE`; commit after review
- **Data retained**: Atlas's auto draft is unusable; a staged migration must be fully hand-written
- Atlas has no advantage over goose here and adds an extra step of "discard auto draft, hand-write a replacement"

### Same-name field, data-structure change (`81abf94`-class scenario)

- Atlas diff generates `ALTER COLUMN ... TYPE bigint[]`, but this fails at execution if the column has jsonb data
- **Data not retained**: must manually change the draft to `ALTER COLUMN ... TYPE bigint[] USING '{}'`
- **Data retained**: must be fully hand-written (add temp column → convert → swap); Atlas's auto draft is useless
- Atlas's lint can detect the type change and warn, but cannot replace human design of the migration process

---

## Applicability judgment

- If OpenToggl's most important near-term problem is "complex migrations easily blow up", `Atlas` is not the shortest path
- If OpenToggl wants to strengthen schema governance, drift detection, and auto-draft generation in the medium-to-long term, `Atlas` can be a follow-up enhancement direction

---

## Conclusion

`Atlas` is a viable plan, but it looks more like a second-stage upgrade path — not ideal as the first-step main plan for replacing `pgschema`.
