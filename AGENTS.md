## Vite+ Skill

- Use the project skill at `.agents/skills/vite-plus/SKILL.md` for all `vp` workflow rules.
- In this repo, package management, checks, tests, builds, and JS tool execution must go through `vp`, not `pnpm`, `npm`, or `yarn`.

## Docs Routing

- Before changing product scope, architecture, implementation structure, or UI semantics, read `docs/00-start-here.md` first.
- For product behavior changes, read `docs/core/product-definition.md` and the relevant file under `docs/product/`.
- For API compatibility and runtime semantics, read `docs/core/toggl-public-definition.md`, the relevant file under `docs/contracts/`, and then `openapi/` or `docs/upstream/` if more evidence is needed.
- For architecture and module-boundary work, read `docs/core/architecture-overview.md`, `docs/core/codebase-structure.md`, `docs/core/frontend-architecture.md`, `docs/core/backend-architecture.md`, `docs/core/testing-strategy.md`, and `docs/core/ddd-glossary.md`.
- Do not start from `docs/reference/` or `docs/challenges/` unless the task explicitly needs supporting evidence, historical analysis, or unresolved questions.
