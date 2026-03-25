# Architecture

Mission-specific architectural guidance for the timer/time-entry refactor.

**What belongs here:** timer-state boundaries, cross-layer facts, and architectural rules workers must preserve.
**What does NOT belong here:** one-off run output or temporary debugging notes.

---

- Keep one canonical timer model:
  - **global running-timer fact** for the sticky top composer/header
  - **workspace-scoped history projection** for `calendar`, `list`, and `timesheet`
  - **anchored popup/editor state** for historical-entry editing
- Do not add another timer store or parallel timer read path.
- `/timer` is one page family. `calendar`, `list`, and `timesheet` are view modes of the same route, not separate pages.
- Mission-authoritative rule: a user may belong to multiple workspaces, but may have only one running timer globally across all of them.
- Current workspace affects history projection only; it does not hide or invalidate the global running timer shown in the top composer.
- Running-composer edits are immediate for supported running fields. Historical-entry popup edits are explicit-save.
- `Continue Time Entry` creates a new running entry from a historical entry; it must not mutate the original historical fact into a running entry.
- `Duplicate Time Entry` is a one-click clone on a clean popup state.
- Calendar direct-manipulation work must update the same underlying time-entry facts consumed by list and timesheet.
- Timesheet row actions (`Add new row`, `Copy last week`) must operate on shared tracking facts rather than introducing a second write model.
- Source-document traceability is part of the architecture of this mission: every implementation-driving source doc in the closed set must carry one active mission status block using the canonical field schema.
