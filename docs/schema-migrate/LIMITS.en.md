**Related docs**:
- [GOALS.md](GOALS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)

## Purpose

This document records the limits and boundaries of the candidate database schema / migrate options. Organized by option; does not write goals or landing steps — only what each is good at, what each is not good at, and what impact each brings.

---

# `pgschema` desired-state apply

The direction OpenToggl currently uses: maintain a target schema SQL, and use `plan/apply` to align the live database to the target state.

## What it supports

- The repo contains a SQL file of the current structure, with low reading friction
- New-database initialization is direct — simply align an empty database to the target state
- Everyday simple DDL changes feel light

## Limits

- Leans toward "target-state alignment" and is not good at expressing complex migration processes
- Easy to degrade into dangerous or uncontrolled diffs for table rebuilds, field renames, and data-structure changes
- Data backfill, compatibility-window dual-write, and staged column drops are not the primary model
- Schema review shows the target state and may not reveal "how the middle transition is done"
- Self-hosting needs to ship an external schema CLI and orchestrate commands additionally
- Tests, entrypoint, and deployment all become coupled to the external `pgschema` tool

## Direct impact

- Fast for small changes, unstable for large ones
- Complex feature development gets constrained in reverse by the schema tool's model
- Docker / single-binary delivery gains an extra layer of dependency and operational cognitive load

---

# Home-grown lightweight migration runner (à la `memos`)

Idea: maintain migration files, version checks, initialization logic, and an executor inside the application yourself.

## What it supports

- Can be built as a single binary with built-in migrate
- Can do baseline initialization
- Can customize commands and startup timing to project needs

## Limits

- You have to maintain the version table, ordering, transaction semantics, locking, and error handling yourself
- You have to build your own test infrastructure, state queries, and review constraints
- Looks simple at first, but you keep filling in capabilities that generic frameworks already have
- If it evolves to complex data migrations and multi-replica deployment, it easily ends up as a half-baked `goose`

## Direct impact

- Fast to implement short-term, but creates a mid-to-long-term infrastructure maintenance burden
- The schema/migrate mechanism becomes a subsystem OpenToggl itself must maintain long-term

---

# `golang-migrate`

General migration framework, file-driven with a standard version table.

## What it supports

- Versioned migrations, state tables, and CLI tooling are all mature
- Widely used in the community, reliable infrastructure
- Suited for append-only migration patterns

## Limits

- More like a generic runner, not particularly close to complex data migration workflows in a Go service
- Not as natural as `goose` for "handily writing a complex Go migration inside the app"
- If OpenToggl wants to deeply embed migrate in its own Go code, the integration experience is so-so

## Direct impact

- Solves versioned execution
- But for a Go monolithic backend like OpenToggl, it is not the smoothest DX

---

# `goose`

A common migration framework in the Go ecosystem, supporting SQL migrations and Go migrations.

## What it supports

- Standard version table and sequential execution model
- SQL migrations are simple and direct
- Complex data migrations can be written in Go
- Easy to embed in a Go binary and Docker startup chain
- Fits the baseline + incremental migrations pattern well
- Built-in advisory lock — safe out of the box for multi-replica deployments
- Migration checksum verification: reports an error when an already-executed migration file is modified
- Supports out-of-order migrations (`--allow-missing`) — missed migrations can be applied later when multiple branches develop in parallel

## Limits

- The default source of truth is the migration history, not a single schema SQL
- The team must additionally maintain a `latest.sql` snapshot to meet the "quickly read the current structure" goal
- It still won't automatically solve large-table backfill, compatibility windows, or dual-write cutover launch-design problems
- If team discipline is insufficient, migrations and the snapshot file will drift

## Direct impact

- Fits OpenToggl's current constraints of "structure changes often, complex migrations are unavoidable, and we must support self-hosting"
- The price is that the team must accept that "database changes are explicitly written migrations, not just edits to the target schema"

---

# `tern`

Migration framework written by the pgx author (jackc); directly accepts `*pgx.Conn`.

## What it supports

- Uses pgx v5 connection directly, with zero driver adaptation
- SQL migrations + Go migrations (`UpFunc`/`DownFunc` callbacks)
- Built-in advisory lock — safe out of the box for multi-replica deployments
- Supports `fs.FS`/`embed.FS`, can be packaged into a single binary
- Supports Go template syntax in SQL migrations
- Well-suited to be embedded in a Go binary

## Limits

- Much smaller community than goose (~900 stars vs 5k+); fewer docs, issue answers, and third-party integration examples
- The default source of truth is the migration history, not a single schema SQL (same as goose)
- The team still needs to maintain a `latest.sql` snapshot (same as goose)
- It still won't automatically solve large-table backfill, compatibility windows, or dual-write cutover (same as goose)
- Template syntax, if abused, can reduce the readability of SQL migrations
- No checksum verification: tern won't detect modifications to already-executed migration files
- No out-of-order migration support: strict sequential numbering, migration numbers easily conflict during multi-branch parallel development

## Direct impact

- Solves the same set of problems as goose; the core difference is stack affinity
- For a full-stack pgx project like OpenToggl, integration friction is lowest
- The price is thinner community support, with fewer references to consult on edge cases

---

# `Atlas`

Declarative schema management + diff + migration generation toolchain.

## What it supports

- Can maintain a target schema and auto-generate migration drafts
- Stronger schema diff, lint, and drift detection capabilities
- More friendly to "a single schema definition"

## Limits

- Complex data migrations still have to be hand-written in the end
- Higher adoption cost than `goose`, more concepts
- OpenToggl's core current problem isn't "missing schema diff" but "missing an explicit, controllable migration process"
- Switching to Atlas from the start has high learning cost and landing complexity

## Direct impact

- May be a valuable enhancement layer long-term
- But as a first-step replacement for `pgschema` right now, it is heavy
