# Timer readability and recent entries (#136, #137)

This is a local correction of the existing device-local appearance and Continue
contracts, with no API, persistence or permission changes.

- Calendar surfaces blend 15% project color with the active `--track-surface`
  using CSS color-mix. Description and project text use semantic foregrounds;
  appearance changes update the blend without a component theme branch. Project
  colors remain content data, not a guarantee of identical rendered RGB values.
- Recent-entry selection reuses Continue: create a new timer with description,
  project, task, tags and billable state. Manual mode only prefills those fields.
  Project/task picker items remain prefill actions. An existing running timer is
  not replaced by a stale suggestion; repeated pending selections are ignored.
- Failures are visible, retain the selected draft and allow retry. Suggestions
  stay available after selecting a project or tag. Missing descriptions retain
  the existing project-name/untitled fallback rather than becoming empty rows.
- Suggestion titles and subtitles use semantic text colors; project color is
  carried by icons/dots. Shared row presentation and suggestion data helpers
  are separate from the dialog.

The [Track Timer Mode documentation](https://support.toggl.com/en-us/article/timer-mode-cv33os/)
confirms auto-start at zero but excludes tags from its historical autocomplete.
This fix deliberately follows the existing OpenTickly Continue behavior requested
in #137, including tags, rather than claiming exact legacy-autocomplete parity.
The [official calendar description](https://support.toggl.com/en-us/article/tracking-time-in-the-calendar-view-1fftm9r/)
does not prescribe a fixed RGB or mixing algorithm.

Acceptance: hook regressions for automatic/manual modes, duplicate requests and
failure/retry; real local PostgreSQL-backed browser tests for both themes,
computed calendar text contrast >= 4.5:1, screenshots and persisted running entry.

## Verification (2026-11-09)

- `vp run check`: passed; four pre-existing warnings (landing unused argument and
  CalendarView void operators).
- `vp run test:unit`: 69 files / 259 tests passed. The subsequent search-result
  task-preservation regression passed with the composer tests (6 focused tests).
- `vp run website#build`: passed.
- `vp run test:e2e:website e2e/timer-issues-136-137.spec.ts
  e2e/appearance-preference.spec.ts --workers=1 --retries=0 --repeat-each=2`:
  six passed against temporary local PostgreSQL/Redis and the source backend.
  Calendar and suggestions screenshots inspected in both appearances.
- The old fixed-dark blend fails the contrast assertion at 3.08:1. Contrast
  measurement now locates the text's actual background ancestor, rather than
  assuming a fixed nesting depth. No sleep or increased assertion timeout.
- `harness-lint check --changed` / `--staged`: no new diagnostics; five existing
  unhandled-mutation warnings in TimerComposerBar remain outside this change.
  The semantic-text rule was verified against the original white fallback.
- No production deployment or issue comment/closure is included.
