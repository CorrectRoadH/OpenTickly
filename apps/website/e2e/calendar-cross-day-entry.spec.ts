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
 * every calendar boundary over time — week, month, year, leap-year. The
 * trade-off is that "today → tomorrow" may cross a week boundary (e.g. when
 * today is Sunday and the user's week starts on Monday). When that happens
 * only one segment is visible in the current week view.
 *
 * Strategy: detect whether both days share the same calendar week (default
 * weekStartsOn = 1/Monday for new users whose preferences endpoint returns
 * no value). If they don't, navigate forward one week after verifying Day 1's
 * segment, then verify Day 2's segment.
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

test.describe("Calendar: cross-day (overnight) time entries", () => {
  test("Cross-midnight entry appears as time-grid blocks on both days, not as an all-day header event", async ({
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
    const today = new Date();
    const start = new Date(today);
    start.setHours(23, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1, 0, 0, 0);

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
      // Week boundary: Day 1 segment is in the current week
      await expect(timeGridEntries).toHaveCount(1);
      await expect(timeGridEntries.first()).toBeVisible();

      // Navigate to next week to see Day 2 segment
      await page.getByRole("button", { name: "Next week" }).click();
      await expect(timeGridEntries).toHaveCount(1);
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
    const today = new Date();
    const start = new Date(today);
    start.setHours(22, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

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

      // Wait briefly for the calendar to stabilize to avoid detached DOM nodes.
      await page.waitForTimeout(500);

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
      // Week boundary: Day 1's segment is the last column of this week
      await expect(timeGridEntries).toHaveCount(1);

      await page.waitForTimeout(500);
      const day1Col = await timeGridEntries.first().evaluate((el) => {
        const slot = el.closest(".rbc-day-slot");
        return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
      });
      // Last column in a 7-day week grid (index 6)
      expect(day1Col).toBe(6);

      // Navigate to next week — Day 2's segment should be the first column
      await page.getByRole("button", { name: "Next week" }).click();
      await expect(timeGridEntries).toHaveCount(1);

      await page.waitForTimeout(500);
      const day2Col = await timeGridEntries.first().evaluate((el) => {
        const slot = el.closest(".rbc-day-slot");
        return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
      });
      expect(day2Col).toBe(0);
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

    const today = new Date();
    const start = new Date(today);
    start.setHours(23, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1, 0, 0, 0);

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

    if (!bothDaysVisible) {
      // Navigate to next week so the Day 2 segment (00:00→01:00, near top of
      // column) is visible — easier to click without scrolling.
      await page.getByRole("button", { name: "Next week" }).click();
    }

    // Click whichever segment is available. When both are visible, prefer the
    // last one (Day 2, 00:00→01:00) because it's near the top and reliably
    // visible without scrolling.
    await expect(timeGridEntries.first()).toBeVisible();
    const entryButton = page.getByRole("button", { name: description }).last();
    await entryButton.scrollIntoViewIfNeeded();
    await entryButton.click();

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible({ timeout: 5_000 });
    await expect(editor.getByLabel("Time entry description")).toHaveValue(description);
  });
});
