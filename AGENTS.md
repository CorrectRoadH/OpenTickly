## Vite+ Skill

- Use the project skill at `.agents/skills/vite-plus/SKILL.md` for all `vp` workflow rules.
- In this repo, package management, checks, tests, builds, and JS tool execution must go through `vp`, not `pnpm`, `npm`, or `yarn`.

## Docs Routing

- Before changing product scope, architecture, implementation structure, or UI semantics, read `docs/00-start-here.md` first.
- For product behavior changes, read `docs/core/product-definition.md` and the relevant file under `docs/product/`.
- For API compatibility and runtime semantics, read `docs/core/toggl-public-definition.md`, the relevant file under `docs/contracts/`, and then `openapi/` or `docs/upstream/` if more evidence is needed.
- For architecture and module-boundary work, read `docs/core/architecture-overview.md`, `docs/core/codebase-structure.md`, `docs/core/frontend-architecture.md`, `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`, and `docs/core/ddd-glossary.md`.
- Do not start from `docs/reference/` or `docs/challenges/` unless the task explicitly needs supporting evidence, historical analysis, or unresolved questions.

## Compatibility Rules

- This project is an implementation of Toggl with fully matching behavior.
- Target 100% compatibility with Toggl for product behavior, API semantics, data shapes, interaction details, and edge-case handling.
- Treat the definitions in `docs/` as the source of truth. Do not invent or reinterpret behavior when the docs already define it.
- Do not introduce product changes, UX deviations, API drift, or "improvements" that make the implementation differ from Toggl.
- If behavior appears ambiguous, resolve it from the documented contracts and upstream evidence instead of making a new local rule.

## Code Requirements

- Write code that is clean, direct, and minimal. Prefer the simplest implementation that correctly satisfies the documented behavior.
- Optimize for low cognitive load. Fewer moving parts, fewer abstractions, and fewer files are preferred when they preserve clarity.
- Code should carry its own weight. Do not create code-shaped documentation, speculative abstractions, or ceremony-heavy patterns.
- Avoid adding environment variables unless they are strictly necessary for the real runtime contract.
- Avoid one-off scripts, migration helpers, temporary scaffolding, or other disposable implementation artifacts unless explicitly requested.
- Do not add fallback mechanisms, configurability, or extension points that are not required by the documented product definition.
- Keep modules focused and readable. Prefer explicit straightforward logic over cleverness.
- When choosing between "generic/flexible" and "small/obvious", prefer "small/obvious" unless the docs require the broader design.
- 代码应该要有注释，说明这里为什么这样写，是解决什么问题、BUG。或者实现什么样特殊的动画、UI效果

## Testing Rules

- `docs/core/testing-strategy.md` is a hard implementation constraint, not optional guidance.
- This project does not assume manual QA or manual product acceptance. Tests are the primary acceptance mechanism.
- Design tests from PRD-defined user stories first. Do not design tests by walking OpenAPI endpoint lists and filling coverage mechanically.
- Treat user stories as the primary source for acceptance tests, not the only allowed source for every test.
- Do not introduce slow tests. The repository standard is that the full test suite should stay fast enough for routine local execution before commit.
- Do not design a split where "fast tests" run locally and "real confidence" is deferred to slow CI-only suites.
- Prefer real integration boundaries over mocks. Use mocks/fakes only at true external system boundaries, not to simulate internal business behavior.
- New code is not complete if it lacks the tests required by the testing strategy for its layer, public contract, and user-facing flow.
- Use OpenAPI as a contract-validation input, not as the primary test design source.
- Add regression tests for bugs, edge cases, invariants, and other TDD-discovered rules even when they do not map to a full user story.
- If a feature is hard to test quickly, simplify the implementation or boundaries instead of normalizing slow, brittle, or heavily mocked tests.
