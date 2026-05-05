import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Cross-midnight (overnight) time entries in the calendar week view.
 *
 * An entry spanning midnight (e.g. 23:00 → 01:00) should render as two
 * time-grid blocks: one at the bottom of Day 1, one at the top of Day 2.
 *
 * ## Date-boundary resilience
 *
 * Tests use `new Date()` ("today") intentionally so they naturally exercise
 * every calendar boundary over time — week, month, year, leap-year.
 *
 * When today→tomorrow crosses a week boundary (e.g. Sunday→Monday with the
 * default Monday-start week), the two days fall in different week views.
 * Since the API filters entries by `start_time` (not overlap), the entry
 * only appears in the week containing its start date. In that case the
 * tests verify a single visible segment and skip cross-week assertions
 * rather than navigating to a week where the entry won't be fetched.
 */

/**
 * Returns true if `dayA` and `dayB` fall within the same calendar week
 * given `weekStartsOn` (0 = Sun, 1 = Mon, …). New E2E users default to
 * Monday-start because the frontend falls back to 1 when the preferences
 * endpoint omits `beginningOfWeek`.
 */
function sameCalendarWeek(dayA: Date, dayB: Date, weekStartsOn = 1): boolean {
  const weekStart = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    const delta = ((copy.getDay() - weekStartsOn + 7) % 7) * -1;
    copy.setDate(copy.getDate() + delta);
    return copy.getTime();
  };
  return weekStart(dayA) === weekStart(dayB);
}

function todayAtUTCHour(hour: number): Date {
  const today = new Date();
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hour, 0, 0, 0),
  );
}

test.describe("Calendar: cross-day (overnight) time entries", () => {
  test("Cross-midnight entry appears as time-grid blocks, not as an all-day header event", async ({
    page,
  }) => {
    const email = `cross-day-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const description = `overnight-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Day User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Create an entry that spans midnight: today 23:00 → tomorrow 01:00
    const today = todayAtUTCHour(12);
    const start = todayAtUTCHour(23);
    const tomorrow = new Date(start);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(1, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: tomorrow.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    const allDayEntry = calendarView
      .locator(".rbc-allday-cell")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    const timeGridEntries = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });

    // Should NOT be in the all-day row
    await expect(allDayEntry).toHaveCount(0);

    const bothDaysVisible = sameCalendarWeek(today, tomorrow);

    if (bothDaysVisible) {
      // Both segments visible in the same week view
      await expect(timeGridEntries).toHaveCount(2);
      await expect(timeGridEntries.first()).toBeVisible();
      await expect(timeGridEntries.last()).toBeVisible();
    } else {
      // Week boundary: only the Day 1 segment (start date) is in this week.
      // The API filters by start_time, so Day 2's segment won't appear in a
      // different week's fetch. Verify we at least see the Day 1 block.
      await expect(timeGridEntries).toHaveCount(1, { timeout: 10_000 });
      await expect(timeGridEntries.first()).toBeVisible();
    }
  });

  test("Cross-midnight entry blocks are positioned correctly in their respective day columns", async ({
    page,
  }) => {
    const email = `cross-day-pos-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const description = `overnight-pos-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Day Pos User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // 22:00 today → 02:00 tomorrow (4 hours total)
    const today = todayAtUTCHour(12);
    const start = todayAtUTCHour(22);
    const tomorrow = new Date(start);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(2, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: tomorrow.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    const timeGridEntries = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });

    const bothDaysVisible = sameCalendarWeek(today, tomorrow);

    if (bothDaysVisible) {
      // Both segments in the same week — verify they occupy adjacent columns
      await expect(timeGridEntries).toHaveCount(2);

      // Wait for calendar layout to stabilize before querying DOM positions.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      const firstCol = await timeGridEntries.first().evaluate((el) => {
        const slot = el.closest(".rbc-day-slot");
        return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
      });
      const secondCol = await timeGridEntries.last().evaluate((el) => {
        const slot = el.closest(".rbc-day-slot");
        return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
      });

      expect(firstCol).not.toBe(-1);
      expect(secondCol).not.toBe(-1);
      expect(firstCol).not.toBe(secondCol);
      expect(secondCol - firstCol).toBe(1);
    } else {
      // Week boundary: only one segment visible (Day 1 block). Verify it is
      // in the last column of the week grid (today is the last day of the week).
      await expect(timeGridEntries).toHaveCount(1, { timeout: 10_000 });

      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      const colInfo = await timeGridEntries.first().evaluate((el) => {
        const slot = el.closest(".rbc-day-slot");
        if (!slot?.parentElement) return { index: -1, total: 0 };
        const siblings = Array.from(slot.parentElement.children);
        return { index: siblings.indexOf(slot), total: siblings.length };
      });
      // Should be the last day-slot column (regardless of gutter columns)
      expect(colInfo.index).toBe(colInfo.total - 1);
    }
  });

  test("Clicking a segment of a cross-midnight entry opens the time entry editor", async ({
    page,
  }) => {
    const email = `cross-day-edit-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const description = `overnight-edit-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Day Edit User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const start = todayAtUTCHour(23);
    const tomorrow = new Date(start);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(1, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: tomorrow.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    const timeGridEntries = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });

    // Wait for at least one segment to appear
    await expect(timeGridEntries.first()).toBeVisible({ timeout: 10_000 });

    // Click whichever segment is available. When both are visible (same week),
    // prefer the last one (Day 2, 00:00→01:00) — near the top, reliably visible.
    const entryButton = page.getByRole("button", { name: description }).last();
    await entryButton.scrollIntoViewIfNeeded();
    await entryButton.click();

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible({ timeout: 5_000 });
    await expect(editor.getByLabel("Time entry description")).toHaveValue(description);
  });
});
