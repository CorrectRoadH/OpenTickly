import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Cross-week time entry visibility.
 *
 * A time entry that spans from one week into the next (e.g. Sunday 23:00 →
 * Monday 01:00) should be visible when viewing *either* week. The entry's
 * start-day segment appears in Week 1; the stop-day segment should appear
 * in Week 2.
 *
 * BUG: The API filters entries by `start_time` only, so the entry is absent
 * from the Week 2 response. This test captures that regression.
 */

/** Return the next date that falls on `dayOfWeek` (0=Sun, 1=Mon, … 6=Sat). */
function nextDayOfWeek(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const delta = (dayOfWeek - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

test.describe("Calendar: cross-week time entries", () => {
  test("Cross-week entry is visible in the next week's calendar view (BUG: currently missing)", async ({
    page,
  }) => {
    const email = `cross-week-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const description = `cross-week-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Cross Week User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Sunday = last day of a Monday-start week. Monday = first day of the next.
    const sunday = nextDayOfWeek(new Date(), 0);
    const monday = new Date(sunday);
    monday.setDate(monday.getDate() + 1);

    const start = new Date(sunday);
    start.setHours(23, 0, 0, 0);
    const stop = new Date(monday);
    stop.setHours(1, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    // Navigate to the timer calendar page and then advance to the NEXT week
    // (the week containing Monday).
    await page.goto("/timer");
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "Calendar" }).click();

    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible();

    // Click "Next week" button in the WeekRangePicker to navigate to the
    // week containing Monday (the stop-day of our cross-week entry).
    const nextWeekButton = page.getByRole("button", { name: "Next week" });
    await nextWeekButton.click();

    // The entry's stop-day segment (Monday 00:00→01:00) should be visible
    // in the Monday column of the next week's calendar.
    const timeGridEntries = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });

    await expect(timeGridEntries).toHaveCount(1);
    await expect(timeGridEntries.first()).toBeVisible();
  });
});
