---
name: tracking-fullstack-worker
description: Implement timer/time-entry behavior that must be proven across backend truth and the browser surface together.
---

# Tracking Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features where backend contract truth and website behavior must change together: cross-workspace running timer behavior, continue/duplicate flows, timesheet actions backed by real tracking facts, or other changes that require one shared proof path across layers.

## Required Skills

- `vite-plus` — use for root JS/toolchain commands and website test execution.
- `agent-browser` — use for manual browser replay on the reused local runtime after the automated proofs pass.

## Work Procedure

1. Read mission `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, `.factory/library/architecture.md`, `.factory/library/user-testing.md`, and `.factory/library/documentation-traceability.md`.
2. Convert the feature's `expectedBehavior` bullets into one shared seeded scenario that spans backend truth and browser-visible behavior.
3. Read only the relevant source docs from the closed set in mission `AGENTS.md`.
4. Write the failing tests first on both sides as needed:
   - backend regression or contract smoke for the canonical fact
   - frontend/Playwright proof for the user-visible surface
5. Reuse the running backend on `8080` and website on `5173`; do not start replacement main runtimes.
6. Implement only after the failing tests prove the intended gap.
7. Keep the same seeded fact across layers. Do not prove the backend and browser with unrelated scenarios.
8. Unless the feature description explicitly says it is proof-only, update the status blocks for every directly used source doc relied on in this feature, using the canonical field labels and one active mission block per doc.
9. For every backend+browser feature, keep both halves of the proof. Do not hand off a browser-only result for a fullstack feature unless the orchestrator explicitly narrowed the scope.
10. Run both the backend and frontend verification commands touched by the feature.
11. Use `agent-browser` for one end-to-end replay of the shared scenario after automated tests pass.
12. In the handoff, explicitly call out:
   - the shared seeded fact or scenario
   - the backend read-model/API proof
   - the browser-visible proof
   - the source docs whose status blocks you updated

## Example Handoff

```json
{
  "salientSummary": "Implemented the cross-workspace running-header flow so a timer started in workspace A stays visible and operable after switching to workspace B while timer history re-scopes to workspace B only. Added one backend truth proof and one browser replay built on the same seeded two-workspace scenario.",
  "whatWasImplemented": "Changed the timer experience so the global running timer remains visible, editable, and stoppable across workspace switches while calendar/list/timesheet history stays filtered to the current workspace. The work paired backend regressions for the current-timer fact with real-runtime browser coverage for the top composer and history projections, and updated the relevant tracking/timer source-doc status blocks.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "go test ./apps/backend/internal/tracking/... -count=1 -parallel 4",
        "exitCode": 0,
        "observation": "Backend current-timer and stop/readback proofs passed."
      },
      {
        "command": "vp run test:e2e:website -- e2e/timer-page.spec.ts --workers 1",
        "exitCode": 0,
        "observation": "Browser proof for cross-workspace running header and workspace-scoped history passed."
      },
      {
        "command": "vp run check -r",
        "exitCode": 0,
        "observation": "Repo JS/TS checks remained green after the fullstack change."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Started a timer in workspace A, switched to workspace B, edited and stopped the timer from the shared header, and observed the history views.",
        "observed": "The running timer stayed visible and operable across the switch, and the history projection remained scoped to workspace B without leaking the stopped workspace-A entry."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/backend/internal/tracking/application/regressions_test.go + apps/website/e2e/timer-page.spec.ts",
        "cases": [
          {
            "name": "workspace switch preserves the global running header while history re-scopes",
            "verifies": "VAL-CROSS-001"
          },
          {
            "name": "stopping a foreign-workspace running timer clears current state without leaking history",
            "verifies": "VAL-CROSS-003"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires a source doc outside the closed set in mission `AGENTS.md`
- The backend truth and browser-visible behavior cannot be made consistent under the approved mission contract
- The feature would require changing runtime boundaries or external dependencies instead of implementing the requested behavior
