# Self-Hosted and Release Artifacts

**Status:** In progress

**Goal:** Treat self-hosted delivery as a first-class product outcome from foundation through release closure.

## Why This Plan Exists

This plan exists because self-hosted delivery is a formal product outcome, not a late packaging afterthought. The repository rules explicitly reject treating compose, migration, readiness, and release artifacts as release-week cleanup.

## Scope

- Single-image runtime direction
- `docker compose` self-hosted baseline
- Health and readiness checks
- Migration/init expectations
- Smoke verification
- Env, volume, upgrade, rollback, and release-artifact documentation

## Development Constraints

- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [codebase-structure.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/codebase-structure.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)

## Lifecycle

- Starts in foundation work
- Tightens during runtime/delivery readiness work
- Closes in release readiness work

## Acceptance Criteria

- Single Go application image serves both Web UI and API
- Compose path is formal for self-hosted packaging and smoke verification
- Startup, migration/init, health, readiness, and minimal key-path smoke are documented and repeatable
- Release output includes image, compose file, env examples, and release instructions

## Current Drift Against Docs

- Self-hosted expectations are partly captured in docs, but active execution still needs stronger runtime and smoke evidence to satisfy [docker-compose.md](/Users/opentoggl-ci/Code/opentoggl/docs/self-hosting/docker-compose.md)
- Release-artifact expectations still need to stay synchronized with runtime-readiness work so they do not drift into a separate late-stage checklist
