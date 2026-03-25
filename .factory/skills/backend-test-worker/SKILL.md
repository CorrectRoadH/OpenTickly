---
name: backend-test-worker
description: Build and verify real-Postgres Go tests and thin transport smoke for tracking behavior.
---

# Backend Test Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that add or fix Go unit/application tests, real-Postgres integration tests, thin transport/contract smoke, conflict regressions, and historical-fact retention coverage.

## Required Skills

None.

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `{repo-root}/.factory/services.yaml`, and `{repo-root}/.factory/library/architecture.md` from this repository checkout (not any personal `~/.factory` location).
2. Identify which assertions the feature fulfills, list every `expectedBehavior` bullet from the
   feature, and convert each one into an explicit backend acceptance case before editing code. Do
   not stop after proving only one invalid-input variant if the feature or contract names more than
   one.
3. Write failing Go tests first at the narrowest effective layer:
   - application/service tests for business rules and canonical readback
   - transport smoke only when the contract needs HTTP/body semantics
4. Use real PostgreSQL, the dedicated test schema, and mission isolation rules:
   - never target the development business schema
   - keep data isolated by `Workspace + User`
   - keep async real, but ensure test-owned queues and drain-to-idle before final assertions where relevant
5. Prefer direct canonical readback in assertions when the feature is about stopped-entry truth, `200 + null`, or invalid-save no-mutation semantics.
6. Keep transport smoke thin: only prove the exact API semantic that could drift.
7. Run the narrowest backend test packages during iteration, then rerun the broader backend command(s) affected by the feature.
8. If any required `expectedBehavior` bullet or requested regression path turns out to be
   impossible under the current documented/API contract, stop and return to orchestrator with the
   exact boundary instead of deleting the failing case and marking the feature complete.
9. If the feature touches conflict behavior and the exact public rule is still ambiguous, prove consistency and return to orchestrator rather than inventing a new rule.
10. In the handoff, call out:

- the dedicated test-schema path used
- whether async drain-to-idle was necessary
- the exact canonical fields/read models that were verified

## Example Handoff

```json
{
  "salientSummary": "Added real-Postgres tracking lifecycle tests for stopped-entry create/edit/readback, invalid time rejection, and idle current-timer `200 + null` semantics. Also kept transport smoke thin by proving the current-timer body shape without moving business logic into handler tests.",
  "whatWasImplemented": "Expanded backend coverage for tracking time-entry lifecycle using the dedicated test schema on the shared external PostgreSQL service. The new tests prove canonical direct readback after create and edit, preserve prior state on invalid save attempts, and lock down the documented idle current-timer semantic with a thin HTTP smoke check.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "go test ./apps/backend/internal/tracking/... -count=1 -parallel 4",
        "exitCode": 0,
        "observation": "Tracking application tests passed with the new lifecycle coverage."
      },
      {
        "command": "go test ./apps/backend/internal/bootstrap/... -count=1 -run 'TestPublicTrackTracking|TestRouteHandlers'",
        "exitCode": 0,
        "observation": "Thin transport smoke for current-timer semantics passed."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Manually inspected one representative current-timer HTTP response after clearing running state.",
        "observed": "The endpoint returned HTTP 200 with literal null body and the direct read model remained idle."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/backend/internal/tracking/application/update_time_entry_test.go",
        "cases": [
          {
            "name": "rejects invalid stop before start without mutating the persisted entry",
            "verifies": "VAL-ENTRY-003"
          },
          {
            "name": "materializes start plus duration without stop as a stopped entry",
            "verifies": "VAL-ENTRY-005"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires changing the dedicated test-schema topology or mission database boundaries
- The exact public behavior is not documented enough to write a truthful regression without inventing semantics
- A necessary runtime dependency on Postgres or Redis is unavailable and cannot be restored
