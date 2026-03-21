# Execution Model and Review Gates

**Status:** Completed

**Goal:** Preserve the orchestration, review, and execution model outside the archived monolithic plan.

## Role Split

- `Orchestrator`
  - Reads the plans, maintains dependency order, task queue, completion state, and risks
  - Prepares minimum-sufficient context for each task packet instead of passing full conversation history
  - Controls parallelism and prevents overlapping write sets
  - Owns final acceptance, integrated verification, and merge decisions
  - Reviews repo hygiene, dependency direction, architecture boundaries, and task-packet drift
- `Story/Test Design Worker`
  - Reads PRD, core docs, OpenAPI, and required Figma references before implementation starts
  - Extracts user stories, goals, failure branches, and constraints
  - Produces story-to-test mappings for downstream implementers
- `Contract Generation Worker`
  - Maintains OpenAPI-driven transport and contract boundaries
  - Generates transport, DTO, validation, contract skeleton, and golden skeleton from OpenAPI sources
  - Does not hand-author public contract shape
- `Implementer`
  - Owns only the assigned file and responsibility boundary
  - Must provide failing-test evidence when behavior changes require TDD
  - Must provide verification evidence before handoff
- `Spec Reviewer`
  - Checks alignment with PRD, OpenAPI, Figma, architecture, and testing strategy
- `Quality Reviewer`
  - Checks implementation quality, maintainability, test design, and regression risk

## Parallelism Rules

- Parallel work is allowed only when write sets do not overlap
- Tasks that modify the same module, route tree, OpenAPI file, or shared package must not run in parallel
- Parallelism priority:
  1. Infrastructure and test skeletons
  2. Independent vertical slices
  3. Shared-layer convergence
  4. Cross-context integration

## Task Packet Requirements

Every implementation task must start with a task packet containing:

1. Task name, goal, and product surface
2. Linked PRD, core docs, OpenAPI, and Figma or fallback references
3. User stories and required test layers
4. File ownership and explicit do-not-touch boundaries
5. Acceptance commands and completion definition

Every implementation handoff must include:

1. Owned file list
2. Failing-test evidence when required
3. Minimal implementation summary
4. Verification commands and outcomes
5. Remaining risks

## Review Gates

Task completion order:

1. Write the failing test when the change is behavior-changing and subject to TDD
2. Implement the minimum change and make it pass
3. Implementer self-check
4. Orchestrator integration review
5. Spec review and quality review
6. Merge or rejection decision

The orchestrator gate checks:

- Task-packet scope
- Dependency direction and module boundaries
- Leaking product semantics into shared/generated layers
- New obvious bad smells or temporary implementation debt
- Whether the repository remains in a safe integration state

## Rejection Rules

Reject immediately when any of the following is true:

- The change exceeds task-packet scope
- It breaks one-way dependencies or module boundaries
- It introduces architecture drift
- It leaves unexplained dirty changes
- It lacks failing-test evidence or local verification evidence where required
- It introduces obvious bad smells that would pollute later work
- It adds temporary implementation paths that will be hard to remove

Rejected work must be fixed by the same implementer, re-verified, and re-reviewed through the full gate chain.

## Collection Startup Order

Each plan collection should start in this order:

1. Extract stories and test mappings
2. Converge contract boundaries
3. Implement backend work
4. Implement frontend work
5. Run integrated verification

## Source

- Derived from `## 4. 强制执行模型：Subagent-Driven Delivery` and `## 12. 执行备注` in [`2026-03-20-opentoggl-full-implementation-plan.md`](/Users/opentoggl-ci/Code/opentoggl/docs/plan/2026-03-20-opentoggl-full-implementation-plan.md)
