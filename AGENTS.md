# Code Quality Standards

Always apply these standards to all code you write.

## Local Development Runtime

Run all source processes from the repository root. `docker compose` is reserved for self-hosted packaging only.

| What             | Command                                         |
| ---------------- | ----------------------------------------------- |
| Frontend         | `vp run website#dev`                            |
| Landing          | `vp run landing#dev`                            |
| Backend          | `air`                                           |
| All E2E tests    | `vp run test:e2e:website`                       |
| Real-runtime E2E | `vp run test:e2e:website:real-runtime`          |
| Single E2E file  | `vp run test:e2e:website -- e2e/<file>.spec.ts` |

Rules:

- All JS/TS toolchain commands go through `vp`. Never invoke `node`, `vitest`, `vite`, `playwright`, `pnpm`, `npm`, or `yarn` directly.
- Env vars live at repo root: `.env.local` (runtime) and `.env.example` (committed template).
- Backend must require explicit datasource config from env; fail immediately if missing. No silent fallback to in-memory stores.
- PostgreSQL schema via `goose` versioned migrations only. Migrations live in `apps/backend/internal/platform/migrate/migrations/`. Current schema snapshot in `apps/backend/db/schema/latest.sql`. See `docs/schema-migrate/PLAN-1.md` for rules.
- Backend hot reload config lives in root `.air.toml`.
- New entrypoints go in root `package.json`, `vp`, or a Go CLI — not in `scripts/*.sh`, `apps/**/scripts/*.mjs`, or wrapper CLIs.
- `apps/landing` is part of the monorepo workspace. It uses `"catalog:"` references like other workspace packages.

## Worktree Development

Worktrees are isolated branches that do not auto-merge into `main`.

- Review and explicitly merge/cherry-pick worktree commits before deleting. Verify with `git status` and `git rev-list --left-right --count` first.
- Delete stale worktrees (only behind `main`, no unique work). Keep `.claude/worktrees/` ephemeral.
- Each worktree needs its own `.env.local` with unique `PORT`, `OPENTOGGL_WEB_PROXY_TARGET`, and frontend port (`vp run website#dev -- --port <N>`).

## Documentation Is Source Of Truth

This repo is implemented from `docs/` and `openapi/`.

- Implementation must match `docs/` and `openapi/` definitions exactly — not "close enough".
- Read relevant docs before making changes. If docs define the behavior, implement that, not a local interpretation.
- If implementation and docs differ, fix the implementation. Never edit docs to match drifted code.
- Doc clarifications must be additive. Changing a documented rule is an explicit change request, not an implementation convenience.
- Code, dependencies, module boundaries, naming, and API contracts that differ from docs must be fixed in code.
- Structure fixes take priority over feature expansion.

## OpenAPI File Ownership

Files in `openapi/` fall into two categories:

- **Upstream (read-only)**: `toggl-track-api-v9.swagger.json`, `toggl-reports-v3.swagger.json`, `toggl-webhooks-v1.swagger.json`. These are external Toggl API specs we must stay compatible with. **Never modify these files.** Work around their quirks in code (e.g. skip validator, adapter layer).
- **Ours (editable)**: `opentoggl-*.openapi.json`. These are our own API definitions. Edit these when adding or changing OpenToggl-specific endpoints.

## API Contract & Go Typing Rules

- Prefer OpenAPI-generated structs for HTTP request/response bodies. If no generated type exists, update the OpenAPI doc first, regenerate, then use it.
- No handwritten `map[string]any`, `map[any]any`, or `map[string]interface{}` in production Go code (`domain`, `application`, `infra`, `bootstrap`, `transport`). Exceptions: generated code and inherently dictionary-shaped external boundaries.
- Keep maps at the narrowest adapter boundary; convert to strong types immediately.
- Tests also prefer explicit structs over maps.

## Code Principles

- **One canonical X**: one name, one implementation, one entrypoint per concept. No aliases, no parallel paths, no duplicates.
- **One responsibility**: a unit does one job. Split if it does multiple unrelated jobs.
- **Best-practice only**: keep the strongest pattern, remove weaker transitional variants.
- **No placeholder normalization**: track transitional paths as debt with exit conditions.
- Use `lo.ToPtr`/`lo.FromPtr`/`lo.FromPtrOr` from `github.com/samber/lo` for pointer helpers.

## Reuse Before Creating

1. Search for similar functionality before implementing.
2. Extend if 80% match exists.
3. Extract to shared module instead of copy-pasting.

## File Size & Organization

Keep files under 300 lines. Split by responsibility, extract sub-components, separate logic from presentation, group by feature.

## Code Style

- Clear code over comments. Block comments at method top when needed.
- Conventional Commit format.

## TDD & Verification

**TDD required for**: new product functionality, bug fixes, behavior changes.
**TDD not required for**: docs-only, config/infra cleanup, mechanical renames, generated-code refreshes, structural refactors without behavior change.

Non-TDD work still requires proportional verification:

- Run unit tests, E2E tests, type checks, lint checks.
- Smoke test with Playwright; take screenshots to verify UI.
- Infra/config changes: verify with startup checks and runtime evidence.
- Schema changes: add a new goose migration + update `latest.sql`, verify with `air` startup and tests.
- Docs-only changes need consistency checks, not `vp check`/`vp test`.

A task is complete only when it passes tests **and** matches `docs/`/`openapi/` definitions.

## E2E Flaky Test Tracking

Playwright config has `retries: 1` and a JSON reporter.每次跑完测试后执行：

```bash
vp run website#test:e2e:stats
```

失败记录累积在 `e2e-failure-stats.json`（gitignored），按失败次数降序。用它定位长期不稳定的测试。
