---
name: tracking-frontend-worker
description: Refactor and verify website timer/time-entry surfaces on the reused local runtime.
---

# Tracking Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that change website timer UI behavior, page-family state, popup/editor behavior, autocomplete, calendar manipulation, or other browser-visible timer/time-entry interactions.

## Required Skills

- `vite-plus` — use for repo-local JS/toolchain commands and website test execution through the canonical root entrypoints.
- `agent-browser` — use for manual browser verification on the reused local runtime when the feature changes user-visible behavior.

## Work Procedure

1. Read mission `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, `.factory/library/architecture.md`, `.factory/library/user-testing.md`, and `.factory/library/documentation-traceability.md`.
2. Translate the feature's `expectedBehavior` bullets and `fulfills` assertions into a concrete UI acceptance checklist before editing.
3. Read only the source docs from the closed set in mission `AGENTS.md` that govern this feature.
4. Write failing frontend tests first:
   - update or add the narrowest useful unit/component tests
   - add or extend real-runtime Playwright coverage for the story path
5. Reuse `http://127.0.0.1:5173` and `http://127.0.0.1:8080`. Do not start a new main frontend/backend runtime.
6. Implement the UI/state refactor only after the new tests fail for the intended reason.
7. Keep the page-family rule intact: `/timer` stays one route, and `calendar`, `list`, `timesheet` are view modes, not new pages.
8. Update the mission status blocks for every directly used source doc you relied on for the feature. Keep exactly one active mission block per doc and use the canonical field labels.
9. Run the narrowest website checks during iteration, then rerun the broader affected commands from `.factory/services.yaml`.
10. Use canonical root `vp` entrypoints only for JS/TS formatting, lint, typecheck, and test commands. Do not switch to ad hoc `npx`, standalone formatter binaries, or non-canonical wrappers.
11. Use `agent-browser` to replay at least one real story path after automated tests pass unless the feature is purely non-visual. If you cannot do that, return to orchestrator instead of marking `followedProcedure` true.
12. In the handoff, explicitly state:
   - which source docs were updated
   - which browser-visible behaviors were manually replayed
   - which tests prove the feature from the real `/timer` surface

## Example Handoff

```json
{
  "salientSummary": "Split shared timer-page state out of `WorkspaceTimerPage`, kept `/timer` as one page family, and made selected TimerView persist across view changes and refresh. Added browser proof for calendar/list/timesheet sharing the same top composer and current timer.",
  "whatWasImplemented": "Refactored the website timer page so calendar, list, and timesheet remain one `/timer` workbench with one shared top composer/header state and one current-timer identity. Added failing-first browser tests for same-route view switching plus TimerView persistence, updated the relevant timer research status blocks, and verified the behavior on the reused 5173/8080 runtime.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "vp run test:e2e:website -- e2e/timer-page.spec.ts --workers 1",
        "exitCode": 0,
        "observation": "Timer page real-runtime coverage passed."
      },
      {
        "command": "vp run check -r",
        "exitCode": 0,
        "observation": "Repo JS/TS checks passed after the timer page refactor."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened `/timer` in the reused website runtime, switched calendar/list/timesheet, refreshed, and rechecked the selected view plus top composer state.",
        "observed": "The app stayed on `/timer`, the selected TimerView persisted, and the same composer/header state remained active across all three views."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/website/e2e/timer-page.spec.ts",
        "cases": [
          {
            "name": "keeps `/timer` stable while switching calendar, list, and timesheet",
            "verifies": "VAL-ENTRY-001"
          },
          {
            "name": "persists selected TimerView after refresh and workspace switch",
            "verifies": "VAL-CROSS-005"
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
- The browser-visible target behavior conflicts with the approved mission contract
- The reused `5173` or `8080` runtime is unavailable and the feature cannot be validated within mission boundaries
