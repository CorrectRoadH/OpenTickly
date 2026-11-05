# Team membership and project visibility (#130, #131)

These are local repairs of existing group and project APIs. They do not add a
schema, endpoint, permission policy or HR/planning feature.

## Contracts and findings

- Organization group updates replace the submitted `users` list. An open member
  dialog must derive that list from the current query result, not an object
  captured when the dialog opened. Keep only the selected group ID in page state.
  Disable membership writes until both the update and query refresh settle.
- The upstream Track specification defines project group POST with `project_id`
  and `group_id`. The current real backend accepts that request. The reported POST
  400 was not reproduced on this checkout.
- Project group GET requires `project_ids`. Upstream labels it as `formData` on
  GET, so the generated client omits the parameter. A narrow public API adapter
  sends it as a query parameter, matching the existing handler. Do not edit the
  upstream specification or generated files. Cache keys include the project IDs;
  empty project sets do not issue requests.
- The project dropdown previously changed privacy before assigning the team, and
  removed old associations before verifying the replacement. Assign the requested
  team first, update privacy, then remove obsolete associations. Compensate
  completed writes if a later operation fails; always refresh authoritative data.
  Disable the controls while the operation and refresh are pending.
- Compensation is not a server transaction: a lost response or failing recovery
  request can still require reconciliation. Recovery failure remains an error,
  and refreshed server state is displayed rather than a fabricated successful
  result. This patch does not claim atomicity across concurrent external clients.

## Validation

- TDD: member dialog tests failed with the captured object; verified continuous
  two-member addition/removal, independent removal, pending writes and retry.
- TDD: against the original project consumer, the browser still displayed Private
  after assignment and a rejected assignment changed an explicitly public project
  to private. The fixture asserts public visibility before exercising the action.
- Real PostgreSQL route test covers group creation, assignment, filtered read and
  removal. It passed before changes, narrowing the defect to the consumer.
- Browser coverage uses the real local Go/PostgreSQL/Redis runtime for persistence
  and reload. It covers project assignment/Everyone, rejected assignment, failed
  privacy change, failed old-team removal, pending controls and repeated member
  changes in one open dialog. Failure/delay injection is at the HTTP boundary.
  Two distinct members are covered by the component tests; the browser member
  case uses the existing organization owner and does not depend on email delivery.

## Results — 2026-11-04

- `vp run test:unit`: 63 files / 243 tests passed.
- `vp run check`: passed; four existing warnings in CalendarView and the landing
  not-found route remain outside this change.
- `vp run test:e2e:website e2e/team-members-regression.spec.ts
  e2e/project-team-regression.spec.ts --workers=1 --retries=0`: 6 passed against
  isolated local PostgreSQL/Redis and source servers. Both saved screenshots were
  inspected (member dialog and persisted project team selection).
- `go test ./apps/backend/internal/bootstrap
  ./apps/backend/internal/catalog/application -run
  'TestProjectGroupsPublicRouteRoundTrip|TestServicePersistsProjectGroupAssignments'
  -count=1`: both packages passed with the isolated database.
- `vp run website#build`, `harness-lint check --changed` and `git diff --check`:
  passed. No production deployment or public release was performed.
