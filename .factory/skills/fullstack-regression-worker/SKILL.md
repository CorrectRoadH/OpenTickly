---
name: fullstack-regression-worker
description: Build cross-layer regression coverage that ties browser-visible behavior to backend truth.
---

# Fullstack Regression Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that must prove a browser-visible regression and a backend read-model truth in the same workflow, especially when current state and history can contradict each other.

## Required Skills

- `vite-plus` — use for repo-local JS/toolchain commands and website test execution.
- `agent-browser` — use to verify the browser-visible half of the regression against the reused local runtime.

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, and the relevant validation assertions.
2. Reproduce the regression first end-to-end so the contradiction is explicit.
3. Write the narrowest failing tests needed on both sides:
   - backend test or smoke proving the canonical read truth
   - browser/page-flow/E2E proving the user-visible contradiction disappears
4. Keep local runtime on `8080` and `5173`, and keep backend assertions bound to the dedicated test schema.
5. Use the same seeded/session state across backend and browser proof; do not validate two unrelated scenarios and call them “fullstack.”
6. Prefer one reproducible story path:
   - create or start the relevant timer fact
   - perform the action that used to create stale divergence
   - read both current-timer and history truth
   - prove the browser now matches backend truth
7. Run both the backend and frontend commands touched by the feature.
8. Use `agent-browser` for one manual replay of the regression path after automated tests pass. If that replay is not possible because of a tooling/session conflict, record the blocker explicitly and return partial/failure instead of silently treating the manual step as complete.
9. Do not claim the procedure was fully followed unless the handoff includes either a real `interactiveChecks` replay entry or an explicit blocker for the manual replay step.
10. In the handoff, explain the original contradiction, the shared seeded/session setup, and how the final proof spans both layers.

## Example Handoff

```json
{
  "salientSummary": "Closed a stale-current-vs-history regression by pairing one backend truth test with one browser-visible replay. The same seeded timer flow now shows matching current-timer and history state after start, stop, and edit.",
  "whatWasImplemented": "Added a cross-layer regression lane for tracking state consistency. The new coverage uses one shared seeded/session scenario to prove backend current-timer reads and browser-visible timer history no longer contradict each other after the previously flaky flow.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "go test ./apps/backend/internal/tracking/... -count=1 -parallel 4",
        "exitCode": 0,
        "observation": "Backend truth tests passed for the regression scenario."
      },
      {
        "command": "vp run test:e2e:website -- e2e/timer-page.spec.ts",
        "exitCode": 0,
        "observation": "Browser regression replay passed on the reused local runtime."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Replayed the start-stop-edit flow in agent-browser and compared the visible history with backend readback.",
        "observed": "The running header cleared at the same time history showed the stopped entry, with no stale contradiction."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/website/e2e/timer-page.spec.ts + apps/backend/internal/tracking/...",
        "cases": [
          {
            "name": "current timer and history stay aligned after stop and edit",
            "verifies": "VAL-REG-004"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The regression cannot be reproduced against one shared seeded/session state
- The browser symptom and backend truth disagree because the product contract itself is ambiguous
- The work would require changing mission boundaries or test topology rather than closing one regression lane
