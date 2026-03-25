---
name: frontend-test-worker
description: Build and verify page-flow and E2E coverage for the tracking browser surface.
---

# Frontend Test Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that add or fix frontend page-flow tests, Playwright E2E coverage, browser fixtures, shell navigation checks, and workspace/timer view regressions.

## Required Skills

- `vite-plus` — use for repo-local JS/toolchain commands and website test execution.
- `agent-browser` — use for manual browser verification of the changed story path on the reused local runtime.

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, and `.factory/library/user-testing.md`.
2. Identify which validation assertions the feature fulfills and treat those as the non-negotiable acceptance checklist.
3. Write or update failing frontend tests first:
   - page-flow tests for page-family and state behavior
   - E2E for story-level acceptance
4. Keep E2E naming aligned with the mission rule: `E2E` already means real runtime, so new tests should use normal `*.spec.ts`.
5. Reuse local runtime on `5173` and `8080`; do not move to alternate local ports unless the orchestrator changes the boundary.
6. When the feature is about navigation or reachability, prove it by clicking through the visible shell UI instead of only using direct `goto`.
7. When the feature is about timer page-family behavior, verify `calendar`, `list`, and `timesheet` under the same seeded facts and stable `/timer` URL. Do not stop at shared-header or container-level proof; each subview must have at least one view-local assertion for the seeded fact or running timer being verified.
8. Run the narrowest relevant frontend tests during iteration, then rerun the broader website E2E command(s) affected by the feature.
9. Use `agent-browser` after the automated tests pass to confirm one real story path and capture any mismatch between runtime behavior and the test surface. For narrow Playwright assertion-fix features that do not change browser-visible behavior beyond the covered assertions, passing real-runtime Playwright evidence is sufficient if no new manual/browser-only risk was introduced. If a pre-existing Chrome DevTools or agent-browser session conflict blocks manual verification, record that conflict in the handoff and rely on the passing real-runtime Playwright evidence instead of fabricating a manual check.
10. If the feature claims a code fix, verify that the commitId reported in the handoff directly contains the feature's code changes. If the behavior was already fixed by an earlier commit or no scoped implementation was needed, say that explicitly instead of pointing at an unrelated commit.
11. Do not treat a rerun-only pass as completion for a flaky-fix feature. If the assigned fix was stabilizing a flaky path, the handoff must identify the specific stabilization change that landed; otherwise return to orchestrator instead of claiming success.
12. Keep the fix scoped to the assigned feature. If a flaky-fix or validator-repair change seems to require unrelated assertion rewrites or broader story changes, stop and return to orchestrator instead of bundling those extras into the same handoff.
13. In the handoff, name the exact stories/assertions proven, the files added/changed, what was checked manually in the browser, and which assertions have explicit view-local proof versus shared-shell/shared-header proof.

## Example Handoff

```json
{
  "salientSummary": "Added timer page-family browser coverage for `/timer` default calendar landing, subview switching, and shell navigation entry. Verified the same seeded running timer remains visible across calendar/list/timesheet on the reused 5173/8080 runtime.",
  "whatWasImplemented": "Created page-flow and Playwright coverage for the tracking timer mainline. The browser tests now prove direct `/timer` entry and shell navigation converge on the same timer state, `/timer` keeps a stable URL while subviews switch, and running/stopped timer facts remain consistent across calendar, list, and timesheet.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "vp run test:e2e:website -- e2e/timer-page.spec.ts",
        "exitCode": 0,
        "observation": "Timer E2E passed against the reused local runtime."
      },
      {
        "command": "vp run check -r",
        "exitCode": 0,
        "observation": "Repo-wide JS checks passed after the frontend test updates."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Used agent-browser to click the visible Timer nav item from the authenticated shell and then switched calendar/list/timesheet.",
        "observed": "The page stayed on `/timer`, Timer nav became active, and the same seeded timer facts remained visible according to each view."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/website/e2e/timer-page.spec.ts",
        "cases": [
          {
            "name": "opens `/timer` on calendar and keeps stable URL while switching subviews",
            "verifies": "VAL-TIMER-001 and VAL-TIMER-002"
          },
          {
            "name": "shows the same running timer across calendar, list, and timesheet",
            "verifies": "VAL-TIMER-004"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The story cannot be validated because reused `5173`/`8080` runtime is unavailable or unstable
- The product docs and observed browser behavior conflict in a way that changes scope or semantics
- The feature needs backend fixture or transport behavior that does not yet exist
