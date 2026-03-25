# User Testing

Validation surface, tool choices, and concurrency guidance for this mission.

**What belongs here:** browser/API/doc-validation surfaces, readiness rules, concurrency limits, and isolation requirements.
**What does NOT belong here:** low-level service command definitions (use `.factory/services.yaml`).

---

## Validation Surface

### Browser surface

- Tool: Playwright website E2E plus browser replay on the reused local runtime
- Target runtime: `http://127.0.0.1:5173` frontend and `http://127.0.0.1:8080` backend
- Scope:
  - `/timer` direct entry
  - `calendar | list | timesheet` page-family behavior
  - global running timer across workspace switches
  - anchored popup/editor behavior
  - timesheet row actions
- Readiness rule: require positive HTTP reachability on both `5173` and `8080` before launching browser validation

### Backend/API surface

- Tool: `go test` plus narrow API/read-model proof
- Scope:
  - global single-running-timer invariant
  - `GET /me/time_entries/current` semantics (`200 + null` when idle)
  - cross-workspace running-timer stop/update behavior
- Schema rule: backend test writes must target the dedicated `opentoggl_test` schema only

### Documentation inspection surface

- Tool: repository file inspection
- Scope:
  - the closed source-doc list in mission `AGENTS.md`
  - canonical mission status block presence
  - status-block field completeness and consistency

## Validation Concurrency

### Browser validators

- Max concurrent validators: **2**
- Rationale:
  - dry run succeeded on the reused website/backend runtime with browser cost as the dominant resource consumer
  - the machine has `10` CPU cores and `16 GiB` RAM, but there is already significant background browser/editor load
  - using 70% of realistic headroom, two concurrent browser validators is the safe ceiling

### Backend validators

- Max concurrent validators: **4**
- Rationale:
  - backend tests use shared PostgreSQL/Redis and should stay below half the available cores
  - `4` leaves room for the reused frontend/backend runtime and browser validators

### Documentation validators

- Max concurrent validators: **1**
- Rationale:
  - doc validation is low-cost but should remain single-threaded so the direct-doc list and status-block evidence stay easy to audit

## Flow Validator Guidance: browser

- Use validator-owned seeded workspaces and entries whenever possible.
- For authenticated browser sessions on the reused local runtime, use `apps/website/e2e/fixtures/e2e-auth.ts` as the canonical source of truth for the working register/login flow and expected landing state (`/timer` with the app shell visible).
- For workspace-switch assertions, prove both positive and negative evidence per view:
  - target-workspace fact present
  - prior-workspace history absent
- For cross-workspace running-timer assertions, prove that the top composer shows the global running timer while the history projection stays scoped.
- Capture console and network evidence for every assigned browser assertion.

## Flow Validator Guidance: backend

- Use the dedicated `opentoggl_test` schema only.
- Prefer direct readback and narrow proof for the assigned assertion rather than broad unrelated regression sweeps.
- When proving the running-timer invariant, verify both the rejection result and the absence of a second persisted running timer.

## Flow Validator Guidance: documentation

- Treat the direct-doc list in mission `AGENTS.md` as canonical.
- Verify exactly one active mission status block per listed doc.
- Verify canonical field names: `Agent`, `Status`, `Current code differences`, `Todo`, `Fully implemented`.
- Fail the assertion if a doc is marked fully implemented while its own block still lists open todo items or unresolved differences.
