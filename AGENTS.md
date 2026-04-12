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

## Rerender Hygiene (Frontend)

A keystroke must re-render exactly the field being typed into. If typing in a dialog input re-renders a sibling chart, list, or the app shell, that is a bug — fix it structurally, do not paper it over with `React.memo` / `useMemo` / `useCallback` (React Compiler owns memoization in this repo).

### Banned: lifting transient form state into page/shell components

A dialog or popover that owns its own ephemeral inputs (text fields, selected color, toggle, step index) **must keep that state inside itself**. Do not make the parent page hold `[name, setName]`, `[email, setEmail]`, `[selectedColor, setColor]` etc. just to hand them back through controlled props. Every keystroke setting state on the parent re-renders every sibling it paints — charts (Recharts), tables, sidebars, the shell.

```tsx
// ❌ Wrong — page owns transient dialog state; every keystroke re-renders the page
function Page() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  return (
    <>
      <ExpensiveChart ... />
      {open && (
        <InviteDialog
          email={email} role={role}
          onEmailChange={setEmail} onRoleChange={setRole}
          onSubmit={() => mutate({ email, role })}
        />
      )}
    </>
  );
}

// ✅ Correct — dialog owns its fields; parent only holds `open` and receives final values
function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ExpensiveChart ... />
      {open && (
        <InviteDialog
          onClose={() => setOpen(false)}
          onSubmit={(values) => mutate(values)}
        />
      )}
    </>
  );
}
```

Rule of thumb: a prop is "transient form state" if it only matters while the dialog is open and is thrown away on close. Those live inside the dialog. Props the parent actually needs to _react_ to (e.g. selected item id that drives a detail pane) stay lifted.

### When the parent does need the value

If the parent genuinely needs to observe a field mid-edit (e.g. live preview), lift only that one field — not the whole form — and isolate the preview in its own component so the rest of the page is unaffected.

### Verifying

For components whose re-render cost is visible (Recharts, large virtualized lists, the app shell), add a render-count regression test using a simple ref counter (see `shared/test/useRenderCount.ts`). Do not use `<Profiler>` for equality assertions — its subtree/phase semantics make counts flaky. Reserve Profiler for performance investigation, not regression tests.

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

## E2E Stability Standards

Tests must only wait for **state signals**, never for time. The single rule: if a default 5s assertion timeout isn't enough, the test is waiting for the wrong thing.

### Banned: inflated timeouts as fixes

Bumping a timeout to make a flaky test pass hides a real bug. When an assertion needs more than the default 5s:

1. **Diagnose**: the app is making the user wait for something that should already be settled (e.g. language flash, stale cache, unblocked render).
2. **Fix the app**: block rendering until the prerequisite state is ready (e.g. `LanguageSync` blocks children until i18n is applied, not fire-and-forget in a `useEffect`).
3. **Then the test passes at default timeout** with no hack.

`{ timeout: 10000 }` on a locator assertion is a code smell, not a solution.

### Banned: `waitForTimeout`

`page.waitForTimeout()` is banned in E2E tests. It is both slow (wastes CI time) and flaky (too short on slow runners).

- **Only exception**: DnD tests that simulate mouse step timing (`waitForTimeout(50)`).
- **Replace with**: auto-retry assertions (`expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveURL()`).

### Required: page-ready gate after navigation

After `page.goto()` or `page.reload()`, always wait for the page-level container testid before any interaction or assertion:

```ts
// ✅ Correct — wait for page content to be ready
await page.goto("/overview");
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
await page.getByRole("link", { name: "Timer" }).click();

// ❌ Wrong — visible ≠ clickable when Suspense/loading overlays exist
await page.goto("/overview");
await expect(page.getByRole("link", { name: "Timer" })).toBeVisible();
await page.getByRole("link", { name: "Timer" }).click();
```

### Required: UI confirmation after API writes

After creating data via `page.evaluate(fetch(...))`, wait for the UI to reflect it before proceeding:

```ts
await createTimeEntryForWorkspace(page, {...});
await page.goto("/timer");
await expect(page.getByText("My Entry")).toBeVisible(); // wait for data
```

### `actionTimeout` in playwright.config.ts

Set `actionTimeout: 5_000` so a stuck `.click()` fails in 5s with a precise locator error, instead of burning the full 30s test timeout with an unhelpful "test timeout exceeded" message. This makes tests **faster to fail**, not slower to pass.

### Flaky Test Tracking

Playwright config has `retries: 1` and a JSON reporter. 每次跑完测试后执行：

```bash
vp run website#test:e2e:stats
```

失败记录累积在 `e2e-failure-stats.json`（gitignored），按失败次数降序。用它定位长期不稳定的测试。
