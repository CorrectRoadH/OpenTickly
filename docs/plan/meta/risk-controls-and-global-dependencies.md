# Risk Controls and Global Dependencies

**Status:** Completed

**Goal:** Preserve the global dependency graph, main risks, and completion controls that apply across all plan collections.

## Global Dependency Rules

1. Foundation work establishes runtime, repository layout, generation paths, and test skeletons for everything downstream
2. Identity/session/tenant/billing foundation must exist before workspace-level product surfaces can be considered formal
3. Membership/access/catalog must exist before tracking, reports, and webhooks can rely on permissions, directory objects, and rate/cost rules
4. Tracking core transactions must exist before tracking extensions, reports, and webhook runtime can share the same business facts
5. Billing commercial views come after billing has already become the source of gate and quota facts; later billing work must not redefine that source of truth
6. Import depends on the core entities, tracking facts, and report readback consistency
7. Instance admin depends on platform runtime, identity/session, and aggregated async-system state
8. Release readiness closes behavior across product surfaces; it does not create a new truth source

## Main Risks

- Parallel work touches shared layers too early and creates integration conflicts
- Testing is designed from endpoint lists instead of user stories
- Reports, webhooks, or import are reduced to CRUD or script paths instead of runtime behavior
- Web and API drift into different semantics
- Test suites grow beyond budget and stop acting as default gates
- Self-hosted delivery is deferred until late release work
- Release output remains source-only instead of producing stable runnable artifacts

## Risk Controls

- Allow parallelism only for non-overlapping write sets
- Require every task packet to name its PRD stories and test chain
- Route all async systems through the same job runtime and record model
- Keep `packages/shared-contracts` limited to public contract types, schema, and generated artifacts
- Review test budget at the end of each major collection instead of deferring it
- Maintain containerized delivery from early foundation work onward
- Require release output to include image, compose, env example, migration/init steps, and smoke instructions

## Global Completion Definition

The overall implementation is only complete when all of the following are true:

- All formal product surfaces have both API and Web expression where required
- `Track API v9`, `Reports API v3`, and `Webhooks API v1` are verified through contract, golden, and story-linked evidence
- `import` and `instance-admin` exist as formal product surfaces rather than scripts or manual procedures
- Web page families still align with PRD and Figma semantics
- High-value user stories have at least one end-to-end verification chain
- `docs/testing/bdd-user-stories.md` stories are either covered, explicitly deferred, or formally removed
- Production builds and container images exist, and self-hosted startup works through `docker compose`
- A new environment can migrate, initialize, pass health/readiness, log in, enter a workspace, and complete minimal smoke flows
- Full-test execution remains within an acceptable local budget
- Remaining gaps are documented, accepted, and do not violate public contracts

## Source

- Derived from `## 9. 统一依赖关系`, `## 10. 风险与控制策略`, and `## 11. 完成定义` in [`2026-03-20-opentoggl-full-implementation-plan.md`](/Users/opentoggl-ci/Code/opentoggl/docs/plan/2026-03-20-opentoggl-full-implementation-plan.md)
