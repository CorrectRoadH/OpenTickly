# Continuous operations

This follows the existing preference, role, tag and client API contracts. No
schema, permission, or public API changes are introduced.

- Settings and profile autosave retain edits made while saving or refreshing.
  One shared form hook captures an immutable submitted snapshot; it only resets
  dirty state if the current form still equals that acknowledged snapshot. Newer
  values are submitted after the current attempt settles, including reverting to
  the original value. Failures preserve input and report an error, without an
  automatic retry loop. Server refreshes only replace clean, idle forms.
- Mounted forms own the debounce and callbacks. Unmount cancels the debounce and
  prevents further queued saves or notifications; an already sent request may
  still complete. Navigating away before an unsent edit is saved remains outside
  this change; there is no new draft persistence or navigation-blocking contract.
- Client, tag and organization-member writes are ordered by entity and tenant in
  the current QueryClient. A queue entry includes the API call and awaited query
  refresh. Failures reach the caller and release the next operation; unrelated
  entities and QueryClients remain independent. This does not serialize other
  browser tabs or external API clients.
- Rename inputs initialize on opening, not on every remote name update. Explicit
  submission of an unchanged displayed name is allowed, so a user can revert an
  earlier pending rename. Client/tag write failures are shown to the user.
- Client and project bulk actions share result handling: wait for all outcomes,
  report success only if all succeed, retain only failed selections for retry,
  and reject duplicate submission while pending. Client selection changes are
  ignored during a batch so completion cannot clear newly selected items.

## Regression evidence

Before implementation, tests reproduced lost autosave input, overlapping writes
for all three entity types, rename drafts replaced by refetch, and premature
client bulk-delete success. Tests exercise real components and React Query;
API responses and save boundaries are controlled for deterministic ordering.

The lint rule catches the former snapshot-reset pattern; complete concurrency
correctness remains a test and review obligation, not a static-lint claim.

## Verification — 2026-11-04

- `vp run test:unit`: 68 files / 255 tests passed.
- `vp run check`: all 12 tasks passed, with four existing warnings outside this
  change (landing not-found and CalendarView). Scoped `vp check` on all 24 changed
  TS/TSX files also passed with no warnings.
- `vp run website#build`: passed, including React Compiler and service worker.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:55173 vp run test:e2e:website
  e2e/continuous-operations.spec.ts e2e/team-members-regression.spec.ts
  e2e/project-team-regression.spec.ts --workers=1 --retries=0`: 11 passed against
  source servers and isolated local PostgreSQL/Redis. These include five new
  continuous-operation scenarios and six #130/#131 regressions. Saved screenshots
  of settings, preference values and partial bulk failure were visually checked.
- Organization role ordering is verified through the real component and query
  hooks with mocked API responses, not a browser test of real member provisioning.
- `harness-lint check --changed` and `git diff --check`: passed. The new rule
  reported both legacy resets before implementation, and no longer reports them.
