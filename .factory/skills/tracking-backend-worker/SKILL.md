---
name: tracking-backend-worker
description: Update backend timer/time-entry contracts, regressions, and source docs for the timer refactor mission.
---

# Tracking Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that change backend tracking behavior, current-timer semantics, HTTP contract smoke, Go regressions, or product docs tightly coupled to backend rules.

## Required Skills

None.

## Work Procedure

1. Read mission `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, `.factory/library/architecture.md`, and `.factory/library/documentation-traceability.md`.
2. Copy the feature's `expectedBehavior` bullets into a local checklist before editing anything.
3. Read only the source docs from the closed set in mission `AGENTS.md` that actually govern this feature. Do not use unlisted docs.
4. Write failing backend tests first at the narrowest effective layer:
   - tracking application/service tests for business rules
   - bootstrap/transport tests only for public HTTP semantics such as `200 + null`
5. Keep backend validation bound to the dedicated `opentoggl_test` schema. Never point tests at the business schema.
6. Implement the backend change only after the new tests fail for the right reason.
7. If the feature changes a product rule already described in `docs/product/tracking.md`, update that doc in the same feature and refresh its mission status block using the canonical field names.
8. Update the status blocks for every directly used source doc you relied on for the feature. Keep exactly one active mission block per listed doc.
9. Run the narrowest backend test commands during iteration, then rerun the broader backend command(s) touched by the feature.
10. Before ending the feature, verify that the handoff commit itself contains the claimed work. Compare the handoff commit diff/stat to the files and behaviors you are about to report; do not hand off a commit that omits the claimed changes.
11. If the feature changes browser-visible behavior indirectly, include one precise manual/API verification step proving the backend truth the UI depends on.
12. In the handoff, explicitly state:
   - which source docs were updated
   - which backend tests were added first
   - what direct read-model/API fact now proves the behavior

## Example Handoff

```json
{
  "salientSummary": "Updated the tracking contract and backend regressions so running-timer uniqueness is global per user, not per workspace. Added cross-workspace conflict coverage plus a thin current-timer transport proof, and refreshed the tracking PRD status block to reflect the new rule.",
  "whatWasImplemented": "Changed the backend tracking rule so a second running timer cannot be created in another workspace for the same user, kept `GET /me/time_entries/current` as the user-global source of truth, added failing-first Go regressions for the conflict/readback paths, and updated `docs/product/tracking.md` with the new rule plus a canonical mission status block.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "go test ./apps/backend/internal/tracking/... -count=1 -parallel 4",
        "exitCode": 0,
        "observation": "Tracking regressions passed with the new global conflict coverage."
      },
      {
        "command": "go test ./apps/backend/internal/bootstrap/... -count=1 -parallel 4",
        "exitCode": 0,
        "observation": "Current-timer transport semantics passed, including idle `200 + null`."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Replayed a two-workspace start conflict against the reused backend and read `/me/time_entries/current` afterward.",
        "observed": "The second start was rejected, no second running row was persisted, and the original running entry stayed current."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/backend/internal/tracking/application/regressions_test.go",
        "cases": [
          {
            "name": "rejects a second running timer across workspaces for the same user",
            "verifies": "VAL-TIMER-001"
          }
        ]
      },
      {
        "file": "apps/backend/internal/bootstrap/...",
        "cases": [
          {
            "name": "returns 200 null when current timer is idle",
            "verifies": "VAL-TIMER-003"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The required behavior depends on a source doc outside the closed set in mission `AGENTS.md`
- The backend rule cannot be implemented truthfully without changing mission boundaries or external dependencies
- The feature would require inventing undocumented semantics rather than applying the approved mission contract
