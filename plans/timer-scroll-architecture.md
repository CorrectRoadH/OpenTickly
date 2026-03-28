# Timer Page Scroll Architecture Rewrite

## Goal

Align with Toggl's scroll model: **window-level scroll + sticky headers + absolute-positioned editor**. Eliminate all internal scroll containers and JS scroll compensation hacks.

## Toggl's Architecture (reference)

```
window.scroll (browser native)
  body (overflow: visible, full content height)
    sidebar (position: fixed, left: 0)
    right-pane (overflow: visible)
      trial-banner (position: sticky, top: 0)
      timer-bar (position: sticky, top: 40px)
      calendar-day-headers (position: sticky, top: 256px)
      calendar-grid (normal document flow, full height)
      editor-popup (position: absolute via Popper.js, z-index: 400)
        date-picker (position: absolute inside editor, z-index: 201)
      editor-overlay (position: fixed, click-outside detection)
```

Key properties:

- **Zero** `overflow: auto/hidden/scroll` on any ancestor of the calendar or editor
- Editor is a sibling of the calendar inside a zero-height `overflow: visible` container
- Editor uses Popper.js for absolute positioning relative to a `position: relative` page container
- Date picker renders inside the editor (not portaled to body), using `absolute` positioning
- Everything scrolls natively with `window.scroll` — editor follows content for free

---

## TODO

### 1. Revert html/body/app overflow: hidden

**File**: `apps/website/src/app/styles.css`

**What**: Remove `overflow: hidden` from `html`, `body`. Change `height: 100%` back to `min-height: 100vh` on body. Change `#app { height: 100% }` back to `min-height: 100vh`.

**Why**: We need window-level scroll to work. The double-scrollbar problem is solved differently — by removing the internal scroll container from the calendar view, there's only one scroll source (window).

```css
html {
  /* no overflow, no height constraint */
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--track-canvas);
}

#app {
  min-height: 100vh;
}
```

### 2. Remove AppShell overflow-based layout, use sticky

**File**: `apps/website/src/app/AppShell.tsx`

**What**:

- Remove `h-dvh overflow-hidden` from the root div
- Sidebar: change from `h-full` inside a flex to `position: fixed; top: 0; left: 0; height: 100vh`
- Main area: remove `overflow-x-auto`, remove the `isTimerRoute ? "overflow-y-hidden" : "overflow-y-auto"` conditional. Just `min-h-screen` with no overflow constraints
- Remove the `isTimerRoute` wrapper div (`h-full min-h-0` vs `min-h-full`) — no longer needed

**Why**: Main content is now in normal document flow. Window scroll handles everything. Sidebar is fixed like Toggl.

### 3. Rewrite WorkspaceTimerPage layout to use sticky

**File**: `apps/website/src/pages/shell/WorkspaceTimerPage.tsx`

**What**:

- Timer header bar: change from `shrink-0` inside flex to `position: sticky; top: 0; z-index: 30`
- Remove the `flex min-h-0 flex-1` wrapper and the `relative min-h-0 flex-1 overflow-x-hidden overflow-y-*` scroll area div entirely
- Calendar/List/Timesheet views render in normal document flow
- Remove `calendarScrollDelta` state and the `.rbc-time-content` scroll listener effect — no longer needed
- Remove `scrollAreaRef` from orchestration usage (or keep for other purposes but not for scroll offset calculation)

**Why**: Content flows naturally. No internal scroll containers. Sticky header stays visible during scroll.

### 4. Remove CalendarView internal scroll container

**File**: `apps/website/src/features/tracking/overview-views.tsx`

**What**:

- In `CalendarView`: remove the `<div className="min-h-0 flex-1 overflow-auto" data-testid="calendar-grid-scroll-area">` wrapper around `DnDCalendar`
- Calendar grid renders at full height in document flow
- Calendar day headers (`rbc-time-header`): add `position: sticky` via CSS so they stick below the timer bar during window scroll

**File**: `apps/website/src/features/tracking/calendar.css`

**What**: Add sticky positioning for `.rbc-time-header`:

```css
.rbc-time-header {
  position: sticky;
  top: <timer-bar-height>px;
  z-index: 20;
  background: var(--track-surface); /* prevent content bleeding through */
}
```

### 5. Rewrite TimeEntryEditorDialog positioning

**File**: `apps/website/src/features/tracking/TimeEntryEditorDialog.tsx`

**What**:

- Remove the outer `<div className="pointer-events-none absolute left-0 top-0 z-40">` layer entirely
- The editor dialog itself uses `position: absolute` with coordinates relative to a `position: relative` page container (set in WorkspaceTimerPage or AppShell)
- Remove the `resolveEditorPosition` function — replace with simpler viewport-aware positioning that accounts for the page-relative container
- Remove `createPortal(document.body)` for CalendarPanel date picker — render it inline inside the editor with `position: absolute; z-index` (no overflow clipping since all ancestors are `overflow: visible`)
- For date picker direction: check if there's enough space below; if not, render above the trigger (`bottom: 100%` instead of `top: 100%`)

### 6. Simplify anchor calculation in orchestration

**File**: `apps/website/src/pages/shell/useTimerPageOrchestration.ts`

**What**:

- `handleEntryEdit`: anchor coordinates are now page-relative (not scroll-area-relative). Use the entry element's `getBoundingClientRect()` + `window.scrollY` to get page coordinates. No scrollAreaRef scrollTop/scrollLeft compensation needed.
- `containerWidth` / `containerHeight`: use `window.innerWidth` / `window.innerHeight` (viewport) for clamping, or the page container's dimensions
- Remove `scrollAreaRef` if it's only used for scroll offset calculation

```ts
const anchorLeft = anchorRect.left - pageContainerRect.left;
const anchorTop = anchorRect.top + window.scrollY - pageContainerRect.top;
```

### 7. Simplify outside-click handler

**File**: `apps/website/src/features/tracking/TimeEntryEditorDialog.tsx`

**What**: The `mousedown` handler currently checks `closest('[data-testid="time-entry-editor-dialog"]')`. This still works. But also remove the date picker portal testid checks (`time-entry-editor-start-date-picker`, `time-entry-editor-stop-date-picker`) since the date picker is now inside the editor DOM, not portaled to body.

### 8. Fix TimerComposerSuggestionsDialog positioning

**File**: `apps/website/src/features/tracking/TimerComposerSuggestionsDialog.tsx`

**What**: Currently uses `pointer-events-none fixed inset-0 z-40` layer. Since the timer bar is now `position: sticky`, the suggestions dialog should use `position: absolute` relative to the timer bar, or `position: fixed` with viewport coordinates from `getBoundingClientRect()`. The current approach may still work — verify and adjust if needed.

### 9. Update E2E tests

**File**: `apps/website/e2e/time-entry-editor.real-runtime.spec.ts`

**What**:

- Update the "calendar scroll" test: instead of scrolling `.rbc-time-content`, scroll the window with `window.scrollBy(0, 200)`. The sanity check (entry moved in viewport) and the delta check (editor moved same amount) should still hold
- Remove any references to `calendar-grid-scroll-area` testid if that div is removed
- Verify all existing editor tests still pass with the new layout

### 10. Verify non-timer pages still scroll correctly

**Files**: All other pages (projects, settings, profile, goals, etc.)

**What**: These pages currently rely on `<main overflow-y-auto>` in AppShell for scrolling. After removing that, they'll scroll via window instead. This should work since their content is in normal document flow with `min-h-full`. Verify each page.

### 11. Clean up dead code

**What**: After all changes, remove:

- `calendarScrollDelta` state and effect from WorkspaceTimerPage
- `calendarScrollTopAtOpenRef` ref from WorkspaceTimerPage
- `scrollAreaRef` from orchestration (if no longer needed)
- `isTimerRoute` conditional in AppShell (if no longer needed)
- The `resolveEditorPosition` function from TimeEntryEditorDialog
- `createPortal` import if no longer used in TimeEntryEditorDialog
- `calendar-grid-scroll-area` testid references

---

## Order of execution

1 → 2 → 3 → 4 (layout foundation)
5 → 6 → 7 (editor positioning)
8 (suggestions dialog)
9 → 10 → 11 (verification and cleanup)

## Risk areas

- **react-big-calendar**: it may rely on having an overflow container for its internal scroll. Removing the wrapper may break its layout. Need to test and potentially configure via its props or CSS.
- **List view**: currently uses `overflow-y-auto` on the scroll area. After removing, list content scrolls with window — verify infinite scroll / virtualization if any.
- **Timesheet view**: same as list view.
- **Mobile layout**: the mobile sidebar overlay uses fixed positioning. Should not be affected.
- **Keyboard shortcuts dialog**: rendered outside the scroll area, should not be affected.
