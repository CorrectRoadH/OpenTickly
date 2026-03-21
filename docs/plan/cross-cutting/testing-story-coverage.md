# Testing Story Coverage

**Status:** In progress

**Goal:** Maintain story-linked verification across all plan collections.

## Why This Plan Exists

This plan exists because stories, tests, and completion claims drift easily unless coverage is maintained continuously. The repository rules require story-linked verification rather than endpoint-count or ad hoc test accumulation.

## Scope

- BDD story inventory
- Story-to-test-layer mapping
- Per-plan coverage status and deferrals
- Coverage expectations for page flow, E2E, contract, integration, runtime, and golden tests

## Development Constraints

- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- [product-definition.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/product-definition.md)
- [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md)

## Required Test Layers

- `Domain Unit`
- `Application Integration`
- `Transport Contract`
- `Async Runtime`
- `Frontend Unit`
- `Frontend Feature`
- `Frontend Page Flow`
- `E2E`
- `Public Contract Golden`

## Rules

- Formal API behavior requires contract coverage
- Public contract output requires golden coverage
- Job/projector/delivery behavior requires runtime coverage
- Formal page families require page-flow coverage
- High-value paths require E2E coverage

## Ongoing Acceptance Criteria

- Each plan records covered stories, missing stories, and approved deferrals
- Page-flow and E2E gaps required by `docs/core/testing-strategy.md` remain visible until closed
- Story coverage is updated at the start and end of each major plan

## Current Drift Against Docs

- Several active plan collections still summarize evidence without a full story-to-test-layer mapping required by [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)
- The story inventory in [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md) still contains partially covered flows that should gate completion more explicitly
