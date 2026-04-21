# Local Development Baseline

**Status:** Completed

**Goal:** Make root-level source-based local development the only canonical default workflow.

## Scope Delivered

- Root-level source startup conventions
- Root-level env conventions
- Removal of root-level local-development shell wrappers as the default path
- Backend hot reload standardized on root `air` plus root `.air.toml`

## Acceptance Snapshot

- Frontend starts from the repository root with `vp run website#dev`
- Backend starts from the repository root with `air`
- Root-level env files are the canonical local-development env surface
- Day-to-day local development does not default to `docker compose`

## Historical Source

- Derived from the completed Local Development Baseline collection and related foundation work in [`2026-03-20-opentoggl-full-implementation-plan.md`](/Users/opentoggl-ci/Code/opentoggl/docs/plan/2026-03-20-opentoggl-full-implementation-plan.md)
