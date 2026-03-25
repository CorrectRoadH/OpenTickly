# Testing Lanes

Named validation lanes used by this mission.

**What belongs here:** lane intent, what goes where, and why a lane exists.
**What does NOT belong here:** command syntax already captured in `.factory/services.yaml`.

---

- `backend-contract`
  - purpose: prove global single-running-timer semantics, current-timer transport behavior, and cross-workspace stop/update rules
  - primary surfaces: `apps/backend/internal/tracking/...`, `apps/backend/internal/bootstrap/...`
  - current VAL-TIMER-001 proof anchor: `apps/backend/internal/tracking/application/regressions_test.go` -> `TestRunningTimerConflictAcrossWorkspaces`

- `frontend-timer-page`
  - purpose: protect `/timer` page-family behavior, selected view continuity, workspace-scoped history, and cross-workspace running-header behavior
  - primary surface: `apps/website/e2e/timer-page.spec.ts`

- `frontend-entry-editor`
  - purpose: protect anchored popup behavior, continue/duplicate flows, save semantics, autocomplete, and date-picker behavior
  - primary surface: `apps/website/e2e/time-entry-editor.real-runtime.spec.ts`

- `fullstack-cross-workspace`
  - purpose: tie browser-visible timer behavior to backend truth when workspace scope and running-timer scope differ
  - primary proof: one seeded scenario spanning start/switch/edit/stop and `GET /me/time_entries/current`

- `doc-traceability`
  - purpose: verify the closed source-doc list, one active mission status block per listed doc, canonical status-block fields, and internal consistency
  - primary scope: `docs/product/tracking.md` and the timer research docs named in mission `AGENTS.md`
