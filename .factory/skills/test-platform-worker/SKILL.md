---
name: test-platform-worker
description: Harden shared test infrastructure, runtime readiness, schema setup, and parallel lane behavior.
---

# Test Platform Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that change shared validation infrastructure: runtime readiness, `pgschema` environment projection, dedicated test-schema setup, browser-lane gating, CI/local test topology, and parallel execution policy.

## Required Skills

- `vite-plus` — use for repo-local JS/toolchain commands and website command execution.
- `agent-browser` — use when validating browser startup, shell reachability, or HTTP/browser readiness for the website runtime.

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, and `.factory/library/*.md` relevant to runtime/test topology.
2. Confirm the feature’s boundary changes before editing anything: ports, schema path, queue prefix rules, CI/local runtime reuse, or readiness gates.
3. Reproduce the current blocker first with the canonical command from `.factory/services.yaml`.
4. If the work touches backend/runtime/schema:
   - keep local runtime on `8080`
   - keep Postgres external on `5432`
   - use `pgschema` as the only schema reconciliation path
   - never point tests at the development business schema
5. If the work touches website/browser runtime or browser-visible readiness:
   - keep local runtime on `5173`
   - validate readiness with an actual HTTP probe, not logs
   - use `agent-browser` for one real browser smoke check after the runtime is reachable
     If the feature is backend-only or only changes OpenAPI/bootstrap/runtime plumbing without browser-visible effects, targeted backend/runtime evidence is sufficient and `agent-browser` is optional.
6. Make the minimum infrastructure/config/code changes needed to unblock the shared path.
7. Re-run the specific failing command(s), then run the broader shared checks affected by the feature.
8. Update shared state if the feature proves factual runtime changes workers need (`services.yaml`, `.factory/library/*`, mission `AGENTS.md` if instructed by orchestrator).
9. In the handoff, be explicit about:
   - which commands were broken before
   - what exact runtime/schema/port behavior is now canonical
   - whether the worker started or reused 8080/5173

## Example Handoff

```json
{
  "salientSummary": "Aligned local validation to reuse 8080/5173, fixed the PG* projection path for pgschema, and made readiness checks depend on reachable HTTP probes instead of startup logs. `go test ./apps/backend/internal/bootstrap/... -count=1` and the browser smoke path are now green.",
  "whatWasImplemented": "Updated runtime/test infrastructure so the mission uses one canonical local path: backend on 8080, website on 5173, external Postgres on 5432 with a dedicated test schema managed by pgschema. Fixed the failing bootstrap/runtime setup, added explicit readiness gating, and verified the browser lane against the real reused runtime.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "go test ./apps/backend/internal/bootstrap/... -count=1",
        "exitCode": 0,
        "observation": "Bootstrap tests passed after env/schema alignment changes."
      },
      {
        "command": "PGHOST=localhost PGPORT=5432 PGDATABASE=opentoggl PGUSER=opentoggl pgschema plan --file apps/backend/internal/platform/schema/schema.sql",
        "exitCode": 0,
        "observation": "Plan executed successfully against the external Postgres service."
      },
      {
        "command": "vp run test:e2e:website -- --list",
        "exitCode": 0,
        "observation": "Website E2E inventory is available against the reused local runtime."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened the reused website runtime with agent-browser after HTTP probe success and navigated into the shell.",
        "observed": "The site loaded on 5173 and the shell was interactive without readiness races."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/backend/internal/bootstrap/...",
        "cases": [
          {
            "name": "runtime readiness uses canonical PG* projection",
            "verifies": "pgschema and backend startup follow one aligned env path"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature requires changing agreed mission boundaries (different local ports, different database topology, or embedded Postgres)
- A required external dependency cannot be restored (`localhost:5432`, `localhost:6379`, reused 8080/5173 runtime)
- The canonical runtime path is still ambiguous after investigation
