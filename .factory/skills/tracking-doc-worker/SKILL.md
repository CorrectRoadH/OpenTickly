---
name: tracking-doc-worker
description: Audit and finalize inline source-document status blocks for the timer refactor mission.
---

# Tracking Doc Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for features that primarily update or audit the inline status blocks in the closed set of implementation-driving source docs.

## Required Skills

None.

## Work Procedure

1. Read mission `mission.md`, mission `AGENTS.md`, `.factory/library/documentation-traceability.md`, and the current `features.json`.
2. Treat the closed source-doc list in mission `AGENTS.md` as canonical. Do not audit docs outside that list unless the orchestrator changes it first.
3. Read the relevant completed feature handoffs or verification evidence so the status blocks describe the real final implementation state.
4. Add or update exactly one active mission status block in each listed source doc.
5. Use the canonical field labels exactly:
   - `Agent`
   - `Status`
   - `Current code differences`
   - `Todo`
   - `Fully implemented`
6. Keep the blocks honest:
   - if work remains, do not mark `Fully implemented: yes`
   - if `Todo` is `none`, the remaining fields must also describe a landed state
7. Run the traceability validation command from `.factory/services.yaml` after the edits.
8. In the handoff, explicitly state:
   - which docs were updated
   - whether any listed doc still has open gaps
   - why each `Fully implemented` value is truthful

## Example Handoff

```json
{
  "salientSummary": "Updated the inline mission status blocks across the closed timer source-doc set and verified the canonical fields and consistency rules. The blocks now reflect which timer docs are fully landed versus which still describe open implementation gaps.",
  "whatWasImplemented": "Added or refreshed one active mission status block in each directly used timer source document listed in mission `AGENTS.md`, using the canonical field schema and aligning every block with the verified implementation state from the completed features. Ran the repo traceability check to confirm field presence and block coverage.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "rg -n \"Mission status|Agent:|Status:|Current code differences:|Todo:|Fully implemented:\" docs/product/tracking.md docs/research/toggl-timer-*.md",
        "exitCode": 0,
        "observation": "Every listed source doc exposed one mission status block with the canonical field names."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Manually reviewed each listed source doc against the final feature evidence.",
        "observed": "The status blocks matched the verified implementation state and no doc marked itself fully implemented while still listing open todo items."
      }
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A required source doc is missing from the closed list in mission `AGENTS.md`
- The final implementation evidence is too incomplete to write truthful status blocks
- The task reveals contradictions between completed feature claims and the actual landed implementation state
