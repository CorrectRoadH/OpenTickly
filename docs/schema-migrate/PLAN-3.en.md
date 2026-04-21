**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)

---

## Implementation Plan 3

### Summary

- Keep `pgschema` desired-state apply and add a manual staged-migration convention; addresses the single schema SQL and the lowest short-term change-cost requirement; does not address the fact that the complex migration process still lacks versioned history, a built-in migration executor, or long-term simplification for self-hosting single-binary delivery.

---

## Core design

### Keep the status quo

- Continue using the single `schema.sql` in the repo
- Continue using `pgschema plan/apply`
- Keep the existing Docker / entrypoint / test chain

### Relationship to current new goals

- If the new goal is merely "continue with the existing delivery model short-term", this plan can still serve as a transition
- But if the new goal has already been raised to: official single-binary startup automatically determines and applies migrations, AND officially supports migrating from the state of `v0.0.17` to the new system, then this plan cannot fully satisfy that goal
- The reason isn't that it cannot automatically apply schema at all; it's that it still lacks an official versioned bridging history, a clear upgrade-state record, and a controlled mechanism to safely funnel the state of `v0.0.17` into the new world

### New constraints

- All complex changes must be split into expand / contract stages in the design doc
- No longer relying on `pgschema` auto-inference for table rebuilds, field renames, or data backfill
- Supplement with manual SQL scripts or one-off ops steps to complete complex migrations

### How each kind of change produces schema and migration

#### 1. Purely adding fields / tables / indexes

- Modify `schema.sql` directly
- Use `pgschema plan/apply`
- If a default value or simple backfill is needed, add manual SQL steps

#### 2. Dropping fields / tables / indexes

- First modify the app to ensure it no longer depends on the old structure
- Then modify `schema.sql`
- Then run `pgschema plan/apply`

#### 3. Field rename / same-name structure change / table rebuild

- `schema.sql` only writes the final state
- Don't rely on `pgschema` to guess rename/rebuild
- Must separately design manual SQL steps:
  - Add temporary structure
  - Backfill
  - Switch code
  - Drop old structure
- These steps don't naturally show up in `schema.sql`; they can only live in extra design docs and operational instructions

#### 4. Data backfill

- Can only be done via manual SQL scripts, background jobs, or temporary ops steps
- `schema.sql` itself does not express the backfill process

### Rules for producing `schema.sql`

- Only expresses the final target state
- Does not express temporary columns, temporary tables, or backfill progress during the compatibility window
- During complex migrations the real process is scattered across design docs and ops steps

### Applicable focus

- Short-term, don't want to switch toolchains
- Prioritize keeping the existing workflow and docs roughly unchanged
- Accept that complex migrations continue to rely on manual control
- Accept that this cannot serve as the official long-term path to "enter the new migration system from `v0.0.17`"

---

## Advantages

- **Partially satisfies single schema source-of-truth goal**: corresponds to "single schema source of truth" in [GOALS.md](GOALS.md); continues to retain a single `schema.sql` with the best current reading experience
- **Partially satisfies new-DB init and existing-DB upgrade goal**: corresponds to "both new-DB init and existing-DB upgrade must be simple" in [GOALS.md](GOALS.md); short-term continues with the existing `pgschema plan/apply` path without immediately refactoring initialization
- **Easiest to maintain the self-hosting status quo short-term**: corresponds to "adapt to self-hosting delivery" in [GOALS.md](GOALS.md), because existing Docker / entrypoint don't need major immediate changes
- **Minimal change**: not a standalone `GOALS.md` goal, but existing code, Docker, tests, and docs coupling moves the least

---

## Disadvantages

- **Fundamental problem unresolved**: corresponds to `pgschema`'s "leans toward target-state alignment and is not good at expressing complex migration processes" in [LIMITS.md](LIMITS.md)
- **Unsuitable long-term for self-hosting simplification**: corresponds to `pgschema`'s "self-hosting needs to ship an external schema CLI and orchestrate commands" in [LIMITS.md](LIMITS.md)
- **Complex migrations rely on discipline to fill gaps**: corresponds to `pgschema`'s "data backfill, compatibility-window dual-write, and staged column drops are not the primary model" in [LIMITS.md](LIMITS.md)
- **Test and production paths still coupled to the external tool**: corresponds to `pgschema`'s "tests, entrypoint, and deployment all become coupled to the external `pgschema` tool" in [LIMITS.md](LIMITS.md)

---

## How the already-occurring pain points are addressed

### FK target change + constraint rewrite + column deletion (`36ad3fc`-class scenario)

- pgschema diff will attempt auto-inference, but results are uncontrolled for FK target changes and CHECK constraint value-set changes
- This plan's response: before updating `schema.sql`, manually execute a series of human SQL scripts to complete the migration, then update `schema.sql` so pgschema thinks it's already at the target state
- Problem: these manual SQL scripts are not in the versioned system; they're scattered in design docs or ops records and cannot be reproduced, code-reviewed, or automatically executed in CI

### Table rebuild (`9a508b2`-class scenario)

- **Data not retained**: pgschema happens to be able to do this (drop + create), but cannot distinguish intent — reviewers only see the final-state change in `schema.sql` and don't know whether this is intentional discard or missed data migration
- **Data retained**: migration scripts must be manually run before pgschema apply; these scripts are also not in the versioned system

### Same-name field, data-structure change (`81abf94`-class scenario)

- pgschema diff attempts `ALTER COLUMN ... TYPE bigint[]`, which fails immediately when data is present
- **Data not retained**: must manually `DROP COLUMN` + `ADD COLUMN` first, then run pgschema apply so it thinks the target state is reached
- **Data retained**: must manually run the full "add temp column → convert → swap" process, entirely outside the pgschema system
- Either way, pgschema itself cannot complete the change; human workaround is required

### Common problem

Under this plan all complex changes degrade into "manually operate the database first, then update schema.sql so pgschema catches up". This means:
- The production migration process is not reproducible
- Self-hosted users cannot auto-complete upgrades
- CI cannot verify the migration path

---

## Applicability judgment

- This is a "defer the decision" conservative option, not a long-term goal plan
- Only suitable when the current phase needs to first stabilize other large changes and temporarily not switch migration systems

---

## Conclusion

If OpenToggl just wants to reduce current refactoring risk and not touch the schema toolchain short-term, this plan can serve as a transition. If the goal is already "official startup auto-migrates + supports funneling from `v0.0.17` into the new migration system", this is not an endgame plan and should not be viewed as a main plan that fully satisfies the goals.
