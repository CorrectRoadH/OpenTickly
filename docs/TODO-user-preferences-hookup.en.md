# TODO: User Preferences Hookup

User preferences (duration format, time format, date format) are saved to the backend
but **never consumed** at display time. The UI hardcodes "improved" duration and 12-hour
time everywhere.

## Phase 1 — Shared read-only hook

Create `apps/website/src/shared/hooks/useUserPreferences.ts`:

```ts
export function useUserPreferences() {
  const query = usePreferencesQuery();
  const preferences = useMemo(
    () => createPreferencesFormValues(query.data ?? {}),
    [query.data],
  );
  return { ...query, preferences };
}
```

- [ ] Create the hook
- [ ] Migrate `ProfilePage.tsx` to use it (keep form/autosave logic local)
- [ ] Migrate `useTimerPageOrchestration.ts` to use it (replace raw `usePreferencesQuery`)

---

## Phase 2 — Fix `formatClockDuration` (duration format)

`overview-data.ts:307` always outputs `H:MM:SS` (improved).
`WorkspaceTimerPage.tsx:1392` has a duplicate copy.

Toggl options:
| Value       | Display example | Format                    |
|-------------|-----------------|---------------------------|
| `improved`  | `0:47:06`       | `H:MM:SS`                 |
| `classic`   | `47:06 min`     | `HH:MM min` / `H:MM:SS h` |
| `decimal`   | `0.78 h`        | hours as decimal           |

- [ ] Add `durationFormat` param to `formatClockDuration(seconds, format)` in `overview-data.ts`
- [ ] Implement `classic` and `decimal` branches
- [ ] Delete duplicate `formatClockDuration` in `WorkspaceTimerPage.tsx:1392`
- [ ] Thread `durationFormat` from `useUserPreferences()` to all 15 call sites:
  - `overview-views.tsx` (entry rows, group totals)
  - `WorkspaceTimerPage.tsx` (running timer, today total, week total)
  - `WorkspaceReportsPage.tsx` (breakdown rows, totals)
  - `reports-page-data.ts` (model building)
  - `reports-regroup.ts` (regrouped rows)
  - `WorkspaceOverviewPage.tsx` (member/project durations)
  - `ReportsDetailedView.tsx`
  - `ReportsProfitabilityView.tsx`
  - `ReportsWorkloadView.tsx`
  - `ReportsCharts.tsx`
  - `OverviewWeekChart.tsx`
  - `AppShell.tsx` (title bar running timer)
  - `ApprovalsPage.tsx`
  - `TimeEntryEditorDialog.tsx`

---

## Phase 3 — Fix `formatClockTime` (12h / 24h)

`overview-data.ts:288` hardcodes `hour12: true`.

- [ ] Add `hour12` param to `formatClockTime(date, timezone, hour12)`
- [ ] Derive `hour12` from `timeofdayFormat`: `"h:mm A"` → `true`, `"HH:mm"` → `false`
- [ ] Thread through all call sites:
  - `overview-data.ts` → `formatEntryRange`
  - `overview-views.tsx` (entry time ranges)
  - `TimeEntryEditorDialog.tsx` (time buttons)
  - `AppShell.tsx` (if applicable)

---

## Phase 4 — Consolidate `beginningOfWeek` fallback

Three places hardcode the `?? 1` fallback independently:
- `useTimerPageOrchestration.ts:442`
- `WorkspaceReportsPage.tsx:131`
- `WorkspaceOverviewPage.tsx:36`

- [ ] Expose `beginningOfWeek` from `useUserPreferences()` with the default baked in
- [ ] Replace the three inline `session.user.beginningOfWeek ?? 1` with the hook value

---

## Phase 5 — `dateFormat` (lower priority)

Currently the UI doesn't render user-visible formatted dates using the preference.
Date keys use `en-CA` locale internally. When date display is needed, use the preference.

- [ ] Audit if any user-facing date rendering exists that should respect `dateFormat`
- [ ] If so, create `formatUserDate(date, dateFormat)` and thread it

---

## E2E Test Plan

All E2E tests below are **real-runtime** (hit actual backend). All preference changes
go through the Profile page UI (select dropdowns, checkboxes) — no direct API calls.
This tests the full autosave chain: UI interaction → react-hook-form → debounce →
`POST /me/preferences` → toast confirmation.

### Shared helper: `setPreferenceViaProfileUI`

Not an API fixture — a Playwright page-object helper that navigates to Profile,
interacts with the native `<select>` or `<input type="checkbox">`, and waits for
the autosave toast before returning.

```ts
async function changeProfileSelect(
  page: Page,
  label: string,
  optionValue: string,
): Promise<void> {
  await page.goto("/profile#time-and-date");
  await expect(page.getByTestId("profile-page")).toBeVisible();
  const select = page.getByLabel(label);           // matches <label> text
  await select.selectOption(optionValue);           // native <select>
  await expect(page.getByText("Your profile preferences have been updated")).toBeVisible();
}

async function changeProfileCheckbox(
  page: Page,
  label: string,
  checked: boolean,
): Promise<void> {
  await page.goto("/profile#timer-page");
  await expect(page.getByTestId("profile-page")).toBeVisible();
  const checkbox = page.getByLabel(label);
  if ((await checkbox.isChecked()) !== checked) {
    await checkbox.click();
  }
  await expect(page.getByText("Your profile preferences have been updated")).toBeVisible();
}
```

The `<select>` elements use uppercase `<label>` text ("DURATION DISPLAY FORMAT",
"TIME FORMAT", "DATE FORMAT", "FIRST DAY OF THE WEEK"). The `PreferenceSelectBase`
component wraps each `<select>` in a `<label>`, so `getByLabel` works with Playwright.

---

### Test file: `e2e/user-preferences-display.real-runtime.spec.ts`

One parameterized test body, driven by a data matrix. Each row = one preference option.

**Setup (shared `beforeAll` per worker):**
1. Register + login
2. `createTimeEntryForWorkspace(...)` — known duration 2847s (47m 27s), start at 14:30

**Single test body:**
1. Go to Profile, change the dropdown identified by `selectLabel` to `optionValue`
2. Wait for autosave toast
3. Navigate to Timer page
4. Assert `expectedText` is visible on the entry

```ts
const matrix = [
  // Duration format
  { selectLabel: "Duration Display Format", optionValue: "improved", expectedText: "0:47:27" },
  { selectLabel: "Duration Display Format", optionValue: "classic",  expectedText: "47:27 min" },
  { selectLabel: "Duration Display Format", optionValue: "decimal",  expectedText: "0.79 h" },
  // Time format
  { selectLabel: "Time Format", optionValue: "HH:mm",  expectedText: "14:30" },
  { selectLabel: "Time Format", optionValue: "h:mm A", expectedText: "2:30 PM" },
  // Beginning of week
  { selectLabel: "First day of the week", optionValue: "0", expectedText: "Sun" },
  { selectLabel: "First day of the week", optionValue: "1", expectedText: "Mon" },
];

for (const { selectLabel, optionValue, expectedText } of matrix) {
  test(`${selectLabel} = ${optionValue} → shows "${expectedText}"`, async ({ page }) => {
    // 1. Change preference on Profile page
    await page.goto("/profile#time-and-date");
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await page.getByLabel(selectLabel).selectOption(optionValue);
    await expect(page.getByText("Your profile preferences have been updated")).toBeVisible();

    // 2. Navigate to Timer, assert format
    await page.getByRole("link", { name: "Timer" }).click();
    await expect(page.getByText(expectedText)).toBeVisible();
  });
}
```

**Bonus test (outside matrix): preference survives reload**
1. Set Duration to "Decimal" + Time to "24-hour" on Profile
2. `page.reload()`
3. Assert Profile dropdowns still show the selected values
4. Navigate to Timer, assert both formats

---

## Existing E2E tests that need updating

These tests hardcode duration or time format strings that will break when formatting
becomes preference-driven. All use the default preference (improved duration, 12h time)
so the assertions are still correct — but they become **implicit** dependencies on the
default. Each should either:
- (a) explicitly note that it assumes default preferences, or
- (b) be resilient to format (e.g. match a regex instead of exact string)

### Duration format assertions (`H:MM:SS` improved format)

| File | Line | Assertion | Notes |
|------|------|-----------|-------|
| `timer-page.spec.ts` | 1250 | `expect(idleElapsed).toBe("0:00:00")` | Running timer idle state |
| `time-entry-full-edit.real-runtime.spec.ts` | 133 | `dialog.locator("text=2:30:00")` | Duration after editing stop time |
| `reports-page.e2e.spec.ts` | 51 | `toContainText("2:30:00")` | Summary total duration |
| `reports-page.e2e.spec.ts` | 52 | `toContainText("2.50 Hours")` | Summary billable hours (this is a separate metric, may not change) |

### Time format assertions (implicit 12h/24h)

| File | Line | Assertion | Notes |
|------|------|-----------|-------|
| `time-entry-editor.real-runtime.spec.ts` | 143, 145, 150, 163 | `toContainText("9:28")` | Start time after edit — ambiguous (works in both 12h/24h since < 12) |
| `time-entry-editor.real-runtime.spec.ts` | 229 | `toContainText("10:00")` | Start time display — ambiguous |
| `time-entry-editor.real-runtime.spec.ts` | 230 | `toContainText("10:30")` | Stop time display — ambiguous |
| `time-entry-full-edit.real-runtime.spec.ts` | 146 | `toContainText("11:30")` | Stop time after edit — ambiguous |

The time-entry-editor tests happen to use times < 12:00 so `"9:28"` / `"10:00"` match
both `"9:28 AM"` and `"9:28"` via `toContainText`. These won't break but are fragile —
if we change them to exact match later they would.

### Recommended approach: shared format helpers for E2E

Don't matrix the old tests — they test editing / reports / timer functionality, not
formatting. Instead, extract the format logic into a shared E2E helper so every
assertion follows the default preference automatically.

Add `e2e/fixtures/e2e-format.ts`:

```ts
/**
 * Format helpers that mirror the app's default preference formatting.
 * If the default preference changes, update these — all E2E assertions follow.
 */

/** Default = "improved" → "H:MM:SS" */
export function expectedDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Default = "HH:mm" (24-hour). Takes a Date and returns "H:MM" or "H:MM AM/PM". */
export function expectedTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}
```

Then update existing tests to call the helper instead of hardcoding:

| File | Before | After |
|------|--------|-------|
| `timer-page.spec.ts:1250` | `toBe("0:00:00")` | `toBe(expectedDuration(0))` |
| `time-entry-full-edit.real-runtime.spec.ts:133` | `locator("text=2:30:00")` | `locator(\`text=${expectedDuration(9000)}\`)` |
| `reports-page.e2e.spec.ts:51` | `toContainText("2:30:00")` | `toContainText(expectedDuration(9000))` |
| `time-entry-editor.real-runtime.spec.ts:229` | `toContainText("10:00")` | `toContainText("10:00")` (ambiguous, keep as-is) |

The time-entry-editor assertions (`"9:28"`, `"10:00"`, `"10:30"`, `"11:30"`) are
all < 12:00 and match in both 12h/24h via `toContainText` — leave them as-is until
a test uses a PM time.

The new `user-preferences-display.real-runtime.spec.ts` matrix tests cover all
format variants × pages explicitly. Old tests stay focused on their own functionality.

---

### Coverage matrix (options × pages):

| Option | Timer | Reports | Overview | Editor | Profile |
|--------|-------|---------|----------|--------|---------|
| `durationFormat: improved` | T1 | T6 | T6 | — | — |
| `durationFormat: classic` | T2 | T6 | — | — | — |
| `durationFormat: decimal` | T3 | T6 | T6 | — | T7 |
| `timeofdayFormat: HH:mm` | T4 | — | — | — | — |
| `timeofdayFormat: h:mm A` | T5 | — | — | — | — |
| `beginningOfWeek: 0` | T8 | — | — | — | — |
| `beginningOfWeek: 1` | T9 | — | — | — | — |
