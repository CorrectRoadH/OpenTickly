import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Cross-week time entry visibility.
 *
 * A time entry that spans from one week into the next (e.g. Sunday 23:00 UTC →
 * Monday 01:00 UTC) should be visible when viewing *either* week. The entry's
 * start-day segment appears in Week 1; the stop-day segment should appear
 * in Week 2.
 *
 * ## Timezone note
 *
 * The entry is created with explicit UTC times (RFC 3339 `Z` suffix) so the
 * cross-week boundary is deterministic regardless of the test-runner timezone.
 * The frontend's `formatTrackQueryDate` sends local-date strings to the API,
 * which the backend parses as UTC — this existing mismatch means positive-UTC-
 * offset runners may shift which week the entry falls into. The test validates
 * the backend overlap filter: an entry whose `stop_time` falls within the
 * queried range is returned.
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
  test("Cross-week entry is visible in the next week's calendar view", async ({ page }) => {
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

    // Use explicit UTC times so the cross-week boundary is deterministic.
    // Sunday 23:00 UTC → Monday 01:00 UTC.
    const startUtc = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}T23:00:00Z`;
    const stopUtc = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}T01:00:00Z`;

    await createTimeEntryForWorkspace(page, {
      description,
      start: startUtc,
      stop: stopUtc,
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

    // The entry's stop-day segment (Monday 00:00→01:00 UTC) should be visible
    // in the next week's calendar view. The backend overlap filter returns the
    // entry because its stop_time falls within the queried week range.
    const timeGridEntries = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });

    await expect(timeGridEntries).toHaveCount(1);
    await expect(timeGridEntries.first()).toBeVisible();
  });
});
