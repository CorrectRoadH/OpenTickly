import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * A time entry that spans across midnight (e.g. 23:00 → 01:00 next day) should
 * appear as two visual blocks in the calendar week view:
 *   - Day 1: from 23:00 to midnight (bottom of the day column)
 *   - Day 2: from midnight to 01:00 (top of the day column)
 *
 * Currently the entry is handed to react-big-calendar unsplit, which renders it
 * as a multi-day header event instead of two time-grid blocks.
 */
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
    const stop = new Date(today);
    stop.setDate(stop.getDate() + 1);
    stop.setHours(1, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    // The entry should appear as time-grid event(s), NOT as an all-day header event.
    // react-big-calendar renders all-day events inside .rbc-allday-cell;
    // time-grid events are inside .rbc-time-content.
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

    // Should appear as two time-grid blocks (one per day)
    await expect(timeGridEntries).toHaveCount(2);

    // Both blocks should be visible
    await expect(timeGridEntries.first()).toBeVisible();
    await expect(timeGridEntries.last()).toBeVisible();
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
    const stop = new Date(today);
    stop.setDate(stop.getDate() + 1);
    stop.setHours(2, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: stop.toISOString(),
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

    await expect(timeGridEntries).toHaveCount(2);

    // Verify the two blocks are in different day columns.
    // Each .rbc-day-slot is a column; the two blocks should not share one.
    // Wait briefly for the calendar to stabilize to avoid detached DOM nodes.
    await page.waitForTimeout(500);

    const firstParentColumn = await timeGridEntries.first().evaluate((el) => {
      const slot = el.closest(".rbc-day-slot");
      return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
    });

    const secondParentColumn = await timeGridEntries.last().evaluate((el) => {
      const slot = el.closest(".rbc-day-slot");
      return slot?.parentElement ? Array.from(slot.parentElement.children).indexOf(slot) : -1;
    });

    expect(firstParentColumn).not.toBe(-1);
    expect(secondParentColumn).not.toBe(-1);
    expect(firstParentColumn).not.toBe(secondParentColumn);

    // The second column index should be one more than the first (adjacent days)
    expect(secondParentColumn - firstParentColumn).toBe(1);
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
    const stop = new Date(today);
    stop.setDate(stop.getDate() + 1);
    stop.setHours(1, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: stop.toISOString(),
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

    await expect(timeGridEntries).toHaveCount(2);

    // Click the second segment (next day, 00:00→01:00, near the top of the
    // column so it's reliably visible without scrolling).
    const entryButton = page.getByRole("button", { name: description }).last();
    await entryButton.scrollIntoViewIfNeeded();
    await entryButton.click();

    const editor = page.getByTestId("time-entry-editor-dialog");
    await expect(editor).toBeVisible({ timeout: 5_000 });
    await expect(editor.getByLabel("Time entry description")).toHaveValue(description);
  });
});
