# Toggl parity issue fixes

Scope: #102 calendar creation, #104 editor overflow, #108 workspace rounding,
and verification of the existing #64 appearance implementation.

## Existing contracts and implementation

- `DESIGN.md` defines device-local system/light/dark appearance. Theme controls
  already exist (79e45a8a); verify persistence and readable editor controls.
- Calendar slot selection belongs to react-big-calendar's mounted DayColumn.
  Its wrapper component type and DOM node must survive callback changes. Pass
  the current start callback through context to the module-level wrapper.
- The editor keeps start/stop/duration and its action within its 440px surface,
  allowing wrapping for long labels instead of clipping the action.
- Workspace v9 settings already persist rounding direction (-1 down, 0 nearest,
  1 up) and interval in minutes. No schema or upstream OpenAPI edits are needed.

## Rounding implementation contract

Apply rounding once to each selected entry's duration before report aggregation.
Do not change stored durations or start/stop timestamps. The same rounded seconds
feed totals, per-day/member/project rows, billable amounts, exports and invoice
prefill. Remove the frontend's independent fixed 15-minute rounding.

Workspace defaults are read from the tenant service at the report boundary.
Request direction/interval override the respective defaults; interval 0 explicitly
disables rounding. Nearest rounds half intervals upward. Reject invalid directions
and negative or overflowing intervals; fail explicitly if a rounded duration
overflows. UI offers the Toggl intervals
(0, 1, 5, 6, 10, 12, 15, 30, 60, 240); existing positive settings remain valid.
Reports' UI toggle starts off and requests interval 0; on uses workspace settings.
The unrelated shared-token endpoint's documented 0/no-rounding behavior remains
outside this change; its response currently does not execute a saved report.

This repairs existing settings and Reports v3 consumers, without changing table
semantics, permission boundaries or resource ownership. Grouped-total rounding
and new HR/plugin features are outside these four issues' implementation scope.

## Acceptance

- Red/green test of real CalendarView DOM identity across callback changes.
- Browser click/drag creation after re-render; action bounds in English and a
  longer translation; persisted new record; screenshots.
- Existing theme tests and browser switching/persistence/screenshot.
- Real PostgreSQL-backed API tests: workspace defaults, overrides, disabling,
  all three directions, per-entry aggregation, summary/weekly/detail/CSV parity,
  invalid inputs and unchanged source entries.
- Browser workspace settings persistence, report toggle, export/invoice prefill.
- Focused Go/JS tests, type/lint checks and harness-lint; record unrelated blockers.

## Verification — 2026-10-11

- `vp test run` on CalendarView, theme-runtime, ThemePreferenceControl and
  MobileTimeEntryEditor: 4 files, 9 tests passed.
- `vp run test:e2e:website -- e2e/calendar-create-regression.spec.ts
  e2e/report-rounding.spec.ts e2e/appearance-preference.spec.ts`: 4 tests passed
  against the real local Go server and PostgreSQL/Redis. English click and French
  drag both persist records after a minute tick; screenshots confirm editor bounds.
  Reports verify settings reload, summary/detail/workload values, rounding off/on,
  downloaded CSV and invoice prefill. Theme verifies light persistence and OS sync.
- `go test ./apps/backend/internal/reports/...`: passed.
- `go test ./apps/backend/internal/bootstrap -run TestReportRounding -count=1`:
  passed with real PostgreSQL, including all CSV endpoints and unauthenticated
  rejection. The test uses Redis DB 15 to isolate its schema from the live server.
- `vp exec --filter @opentickly/website tsc -p tsconfig.json --noEmit`: passed.
- `vp run website#build`: passed, including service worker generation.
- `vp check`: 0 errors; two pre-existing warnings in
  `apps/landing/app/llms/index.ts:18` about interpolating `Promise<string>`.
- `harness-lint check --changed`: no diagnostics (17 files, 32 active rules).
- `git diff --check`: passed. Upstream OpenAPI files are unchanged.

CSV validation also required a runtime schema adapter for the upstream exports'
undeclared `APIKeyAuth` security scheme. It uses the existing public Track
identity check; no authentication bypass was added. No production deployment
or GitHub issue closure is included in this verification.

## Integration verification — 2026-10-12

- Refreshed `go test ./apps/backend/internal/reports/...` and the real PostgreSQL
  `go test ./apps/backend/internal/bootstrap -run TestReportRounding -count=1`:
  passed against an isolated local database and Redis service.
- Refreshed the three focused browser specs above: 4 tests passed, with screenshots
  confirming editor bounds, light appearance and rounded report totals.
- `vp test run apps/website/src packages/web-ui/src`: 55 files, 204 tests passed.
  Explicit matcher registration in the shared setup is needed by this Vite+
  installation; without it, DOM matcher assertions fail with Invalid Chai property.
- `vp check`: zero errors, the same two existing landing warnings.
- `harness-lint check --changed`: no diagnostics; `vp staged --no-stash` passed.
- Contributor PRs #103 and #105 supply the original calendar wrapper and time-row
  fixes. The integration must preserve those changes and their regression tests.
- These checks are local/CI integration evidence, not production acceptance.

## Audit payload security (v0.4.2)

Audit capture is subject to the same tenant boundary as the mutation. Resolve
membership before reading previous state; constrain entity snapshots by workspace
(and time entries by user), and discard all payloads when the mutation fails.
Workspace audit events belong to the workspace's actual organization, including
when it differs from the actor's home organization. Foreign workspace paths must
not create audit records in either tenant. Entity table names remain allowlisted
and values remain SQL parameters.

The audit body budget is 8 KiB, independent of the request body consumed by the
handler. Replay the captured prefix followed by the original stream and preserve
its closer. Omit incomplete, oversized and scalar JSON; recursively remove
credential fields and omit authentication/SSO/token-rotation payloads. Apply the
same sanitizer on insert and read/export, including historical rows. Historical
rows attributed to the wrong workspace organization are excluded, and previous
snapshots whose workspace differs from the record are omitted. This does not
rewrite historical database rows or rotate previously exposed credentials.

Audit persistence finishes synchronously with a two-second timeout derived from
the request context, retaining context values across disconnect cancellation.
Persistence failure is logged without payloads and does not undo a successful
business operation. There is no detached per-request audit goroutine.

Verification: `TestAuditSecurity*` exercises the real HTTP router, application
services, PostgreSQL migrations/stores and Redis. Red runs reproduced cross-tenant
previous-row disclosure, raw rotated-token storage, truncated large requests and
historical payload disclosure; the corrected implementation passes the negative
and positive cases. The suite also checks non-home organization attribution and
SQL metacharacters round-tripping as ordinary data. CI runs it with isolated
PostgreSQL and Redis services. `local.audit-snapshot-tenant-scope` prevents
reintroducing the known unscoped snapshot query.

## Organization deletion session recovery

See [issue #118](organization-deletion-session.md) for deletion recovery, existing
workspace selection, cache removal and regression coverage.
