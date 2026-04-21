**Related docs**:
- [GOALS.md](GOALS.md)
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)

## Purpose

This document does not restate the goals, nor does it rehash the implementation details of each plan.

It only answers four questions:

- Why `PLAN-1` / `PLAN-2` / `PLAN-3` / `PLAN-4` are all currently retained
- Which one is currently recommended as the main path
- Why the other plans are not currently chosen as the main path
- Under what preconditions the recommended conclusion may change

---

## Preconditions first

- The official architecture of the current repository still uses `pgschema` as the sole official schema management path
- As a result, `PLAN-1`, `PLAN-2`, and `PLAN-4` are not ordinary implementation-detail adjustments — they are each challenging the current official architectural conclusion
- `PLAN-3` is the conservative option that does not change the current official architecture

This means:

- Retaining multiple plans is reasonable, because they represent decisions at different levels
- Which plan is currently recommended depends on whether the team is making an "endgame architecture choice" or a "short-term transition decision"

---

## Why keep four plans

### Keep `PLAN-1`

- It represents the long-term option of "explicit versioned migrations as the main path"
- It directly addresses the core goals of complex migrations, reviewable processes, and reproducible self-hosting execution
- It is one of the most mature and common paths in the Go ecosystem among current candidates

### Keep `PLAN-2`

- It represents the long-term option of "simultaneously strengthening declarative schema governance and versioned migrations"
- It is not the shortest current path, but it has extra value for long-term drift detection, lint, and schema governance
- Keeping it helps avoid misreading "not chosen now" as "never chosen again"

### Keep `PLAN-3`

- It represents the transitional option of "not overturning the current architectural conclusion for now"
- But it must be clear: this is not "good enough for now"; rather, **all complex changes degrade into manual operations on the database outside the official system, which `pgschema` then has to retroactively acknowledge**
- Keeping it helps articulate "don't switch in the short term" clearly, rather than pretending this option doesn't exist

### Keep `PLAN-4`

- It represents the long-term option of "retain versioned migrations as the main path, but stay as close as possible to pgx/native SQL style"
- It responds to another real preference: you don't necessarily have to bring in a heavier framework like `goose`; you can also choose a route closer to the existing Go/pgx stack
- Keeping it helps separate the question "do we want Go migration framework capabilities" from "do we want to switch to versioned migrations"

---

## Current recommendation

If the goal is to pick a long-term main path now, the current recommendation is [PLAN-1.md](PLAN-1.md).

### Rationale

- It brings complex migrations, explicit migration processes, execution history, and self-hosting execution paths into the official mechanism
- It is lighter than `PLAN-2` and does not introduce two extra layers of complexity — declarative schema governance and migration generation — in the first step
- It satisfies the explicit functional requirement of single-binary delivery; operators do not need a separate standalone schema CLI
- **goose has the lowest long-term maintenance cost among the four versioned-migration paths**

### Why choose goose over tern

`PLAN-1` (goose) and `PLAN-4` (tern) solve exactly the same problem. The core difference is not capability but pragmatic engineering considerations:

**1. The benefit of "staying close to pgx style" is overrated**

tern's main selling point is that it directly accepts `*pgx.Conn`, avoiding a `database/sql` adapter layer. But OpenToggl uses `pgxpool.Pool`; tern still needs `pool.Acquire()` and then `conn.Conn()`. goose needs `stdlib.OpenDBFromPool(pool)`. The integration difference between the two is a handful of lines of code, not an architectural-level difference.

This is glue code you write once and never touch again — it should not be the primary driver of the selection.

**2. The gap in community maturity is a real long-term cost**

| Dimension | goose | tern |
|------|-------|------|
| Stars | 10,400+ | 1,275 |
| Forks | 632 | 86 |
| Production usage | Widespread, easy to search | Few, mostly rely on reading source |
| Third-party integration examples | Abundant | Sparse |

For a 1–2 person team, "being able to Google an answer when you hit a problem" is a real productivity gap. You won't feel this gap for everyday simple migrations, but it will surface when handling baseline strategies, CI validation, multi-branch conflicts, and production incident investigations.

**3. goose has defensive features that tern lacks**

- **Checksum verification**: goose v3 verifies that already-executed migration files haven't been tampered with. tern does not have this capability. If someone edits an already-executed migration file, tern won't error; goose will.
- **Out-of-order migration**: goose supports `--allow-missing`, allowing a skipped migration to be applied later. tern is strict about order, which easily causes conflicts when multiple branches are developed in parallel.

These features aren't necessarily needed early on, but once you do need them, the cost of building them yourself far exceeds getting them from the framework.

**4. tern's advantages are not decisive reasons**

- **Built-in advisory lock**: goose v3 supports this too. Not a differentiator.
- **Go migrations receive `*pgx.Conn`**: Convenient, but it also means migration code more easily ends up depending on the project's current implementation habits, increasing the risk of historical migration rot. goose's `*sql.DB` naturally forms a layer of isolation.
- **Template syntax**: Writing Go templates inside SQL migrations is a double-edged sword and easily reduces readability. OpenToggl doesn't need this capability.
- **Lighter dependencies**: goose's dependencies are also not heavy — not a real bottleneck.

### Summary

tern is not a wrong choice. But goose is stronger on community maturity, defensive features, and multi-branch collaboration support, while tern's advantages (native pgx integration, built-in advisory lock) only save a few lines of glue code in real integration.

**Selection should prioritize long-term maintenance cost, not stylistic preference at initial integration.**

---

## Why `PLAN-4` is not chosen as the main path right now

- `PLAN-4` is viable; tern itself is healthily maintained (v2.3.6, released 2026-03-28, with jackc continuing maintenance)
- But "staying close to pgx style" is a preference call, not an objective advantage, and should not be the primary selection driver
- The community size difference is 8× (10,400 vs 1,275), which is a real productivity gap when investigating edge cases or looking up best practices
- Lacking checksum verification and out-of-order migration support, the team would need to build these themselves or accept the risk
- Runner boundaries, baseline strategy, `latest.sql` drift detection, and Go migration discipline all need to be filled in by the team regardless, but in goose's ecosystem more ready-made references can be found

When we would switch to `PLAN-4`:

- The team explicitly believes native pgx integration DX takes priority over community maturity
- The team accepts tern's functional boundaries and does not need checksum verification or out-of-order migration
- The team is willing to solve edge cases on their own in a smaller community

---

## Why `PLAN-2` is not chosen as the main path right now

- `PLAN-2` introduces three layers of change simultaneously: declarative schema management, migration generation, and runtime execution
- The most pressing current problem is "the migration process must be explicitly controllable", not "we're missing a stronger diff generator"
- In complex migration scenarios, `Atlas` still ultimately requires humans to design the migration process
- Therefore it looks more like a phase-two enhancement than a first-step main path

When we would switch to `PLAN-2`:

- The team wants to also build drift detection, lint, and schema diff automation in the medium-to-long term
- The team is willing to pay the higher tooling-adoption cost
- The current goal is not just replacing `pgschema` but also building a stronger schema governance system

---

## Why `PLAN-3` is not chosen as the long-term main path right now

- `PLAN-3` can retain the readability advantage of the current desired-state SQL and the lowest short-term change cost
- But it does not genuinely solve the problem of how complex migrations enter an official, reproducible, verifiable path
- All complex changes degrade into "manually operate the database first, then update schema.sql so pgschema catches up" — meaning production migration processes are not reproducible, self-hosted users cannot complete upgrades automatically, and CI cannot validate the migration path
- This is not "good enough for now"; it is operating outside the official system

So:

- `PLAN-3` is only suitable as a transitional option
- It is not suitable as an endgame option

When we would pick `PLAN-3` in the short term:

- The current phase must first stabilize other large changes
- The team temporarily cannot bear the cost of switching the migration system
- The team explicitly accepts that it is only a phase-wise transition and does not mistake it for the endgame

---

## Risks of maintaining the status quo

If none of the plans is chosen and we don't even adopt the transitional constraints of PLAN-3, continuing the current operating model:

- The pain points recorded in [GOALS.md](GOALS.md) will continue to occur: FK changes uncontrollable, table rebuilds indistinguishable by intent, column type changes failing immediately when data exists
- Every complex schema change depends on manual operations outside the pgschema system, with no versioned record
- Self-hosted users need to manually orchestrate extra steps to upgrade, conflicting with the single-binary delivery goal
- The testing path (directly executing schema.sql) and the production path (pgschema apply) remain separated

These are not hypothetical scenarios — they are problems that have already occurred in recent commit history.

---

## How to choose

### Choose `PLAN-1` if the current goal is:

- Establish a long-term official main migration path for OpenToggl
- Prioritize solving complex migrations and reviewable migration processes
- Satisfy single-binary delivery
- Have the official version automatically decide and execute migrations at startup
- Prioritize long-term maintenance cost and community support

### Choose `PLAN-4` if the current goal is:

- Also switch to a long-term migration main path
- Explicitly prefer the DX of native pgx integration
- Accept tern's community scale and functional boundaries

### Choose `PLAN-2` if the current goal is:

- In addition to migration execution, simultaneously build a stronger schema governance system
- The team is willing to accept higher tooling-adoption cost and workflow complexity
- The goal is not just replacing `pgschema` but also strengthening drift/lint/diff automation

### Choose `PLAN-3` if the current goal is:

- Short-term stability for other large changes
- Temporarily cannot bear the cost of switching the migration system at this phase
- Accept it as only transitional and not mistake it for the endgame

---

## Current conclusion

- Keeping four plans is reasonable, because they cover the long-term main path, an enhanced long-term path, a short-term transitional path, and a long-term main path closer to the existing stack respectively
- If a main recommendation must be given now, [PLAN-1.md](PLAN-1.md) is the priority — goose's advantages in community maturity, defensive features, and multi-branch collaboration support outweigh the few lines of glue code that tern's native pgx integration saves, in the long run
- If native pgx integration is explicitly preferred over community maturity, [PLAN-4.md](PLAN-4.md) is the clear runner-up
- If only the smallest change is allowed, without committing to an endgame, [PLAN-3.md](PLAN-3.md) may be adopted temporarily
- [PLAN-2.md](PLAN-2.md) is more suitable as a follow-up enhancement roadmap, not a first-step main path
