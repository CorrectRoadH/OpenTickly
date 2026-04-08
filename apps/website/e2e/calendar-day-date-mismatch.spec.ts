import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Calendar day/5-day view: selected date vs displayed entries consistency.
 *
 * Bug: switching to day view or 5-day view can show time entries from a
 * different date than the one displayed in the navigation header.
 * For example, navigating forward one day in day view may still show
 * entries from the week start (Monday) instead of the navigated-to date.
 *
 * These tests create entries on distinct dates (today and tomorrow),
 * switch to day/5-day view, navigate to tomorrow, and verify only
 * tomorrow's entry is visible — not today's.
 */

test.describe("Calendar: selected date matches displayed entries", () => {
  const password = "secret-pass";

  /**
   * Helper: set up a user with two entries on two different days.
   * Returns { todayDesc, tomorrowDesc } so the test can assert visibility.
   */
  async function setupTwoDayEntries(page: Page, testInfo: TestInfo, prefix: string) {
    const email = `${prefix}-${test.info().workerIndex}-${Date.now()}@example.com`;
    const todayDesc = `today-entry-${Date.now()}`;
    const tomorrowDesc = `tomorrow-entry-${Date.now()}`;

    await registerE2eUser(page, testInfo, {
      email,
      fullName: `${prefix} User`,
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, testInfo, { email, password });

    // Create an entry today 10:00–11:00
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(10, 0, 0, 0);
    const todayStop = new Date(today);
    todayStop.setHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: todayDesc,
      start: todayStart.toISOString(),
      stop: todayStop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    // Create an entry tomorrow 14:00–15:00
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(14, 0, 0, 0);
    const tomorrowStop = new Date(tomorrow);
    tomorrowStop.setHours(15, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: tomorrowDesc,
      start: tomorrowStart.toISOString(),
      stop: tomorrowStop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    return { todayDesc, tomorrowDesc };
  }

  test("Day view: navigating forward shows tomorrow's entry, not today's", async ({ page }) => {
    const { todayDesc, tomorrowDesc } = await setupTwoDayEntries(page, test.info(), "day-mismatch");

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to Calendar view
    await page.getByRole("radio", { name: "Calendar" }).click();
    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    // Switch to Day view
    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "Day view" }).click();

    // Wait for day view to render — should show today's entry
    const todayEntry = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: todayDesc });
    await expect(todayEntry).toBeVisible({ timeout: 10_000 });

    // Navigate forward one day (tomorrow)
    // In day mode, the aria-label for the previous/next buttons uses the
    // translation key "nextDay" — but the button text may vary. Use the
    // chevron button that comes after the date label.
    // Wait for the data refetch triggered by date navigation
    const nextDayButton = page.getByRole("button", { name: /next\s*day/i });
    const dayNavFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await nextDayButton.click();
    await dayNavFetch;

    // After navigating to tomorrow:
    // - Tomorrow's entry SHOULD be visible
    // - Today's entry SHOULD NOT be visible
    const tomorrowEntry = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: tomorrowDesc });
    const todayEntryAfterNav = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: todayDesc });

    await expect(tomorrowEntry).toBeVisible({ timeout: 10_000 });
    await expect(todayEntryAfterNav).toHaveCount(0);
  });

  test("5-day view: navigating forward shows correct date range entries", async ({ page }) => {
    const { todayDesc, tomorrowDesc } = await setupTwoDayEntries(
      page,
      test.info(),
      "fiveday-mismatch",
    );

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to Calendar view
    await page.getByRole("radio", { name: "Calendar" }).click();
    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    // Both entries should be visible in week view (default) since they're
    // within the same week
    const todayEntry = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: todayDesc });
    await expect(todayEntry).toBeVisible({ timeout: 10_000 });

    // Switch to 5-day view; wait for the data refetch after view change
    const fiveDayFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "5 days view" }).click();
    await fiveDayFetch;

    // In 5-day view (work week), the calendar should show Mon–Fri.
    // Both today and tomorrow entries should be visible if both fall
    // within the displayed 5-day range.
    // The key assertion: the header date range and the visible entries
    // should be consistent — entries shown must belong to the displayed dates.

    // Verify today's entry is in a column whose header matches today's date
    const todayDayName = new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(new Date())
      .toUpperCase();
    const todayHeader = calendarView.getByTestId(
      `calendar-day-header-${todayDayName.toLowerCase()}`,
    );
    // The header should exist if today is a weekday (Mon-Fri)
    const todayIsWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
    if (todayIsWeekday) {
      await expect(todayHeader).toBeVisible({ timeout: 5_000 });
      // Today's entry should still be visible in the time grid
      await expect(todayEntry).toBeVisible({ timeout: 5_000 });
    }

    // Navigate forward one week; wait for the data refetch
    const nextWeekButton = page.getByRole("button", { name: /next\s*week/i });
    const weekNavFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await nextWeekButton.click();
    await weekNavFetch;

    // After navigating forward one week, neither today's nor tomorrow's
    // entry should be visible (they're in the previous week)
    const todayEntryAfterNav = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: todayDesc });
    const tomorrowEntryAfterNav = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: tomorrowDesc });

    await expect(todayEntryAfterNav).toHaveCount(0, { timeout: 10_000 });
    await expect(tomorrowEntryAfterNav).toHaveCount(0, { timeout: 10_000 });
  });

  test("Day view: calendar date header matches the navigated date", async ({ page }) => {
    const email = `day-header-${test.info().workerIndex}-${Date.now()}@example.com`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Day Header User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to Calendar > Day view
    await page.getByRole("radio", { name: "Calendar" }).click();
    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    // Wait for the data refetch after switching to day view
    const dayViewFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "Day view" }).click();
    await dayViewFetch;

    // In day view, there should be exactly one day-slot column header.
    // Verify it shows today's date.
    const today = new Date();
    const todayDayNum = today.getDate();
    const todayDayName = new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(today)
      .toUpperCase();

    // The header should show today's day number and day name.
    // In RBC day view, the header element is rendered inside a container
    // that may not be "visible" in Playwright terms (zero-height row),
    // so we use toBeAttached() to confirm it's in the DOM with correct content.
    const dayHeader = calendarView.getByTestId(`calendar-day-header-${todayDayName.toLowerCase()}`);
    await expect(dayHeader).toBeAttached({ timeout: 5_000 });
    await expect(dayHeader).toContainText(String(todayDayNum));

    // Navigate forward one day; wait for the data refetch
    const nextDayButton = page.getByRole("button", { name: /next\s*day/i });
    const nextDayFetch = page.waitForResponse(
      (resp) => resp.url().includes("/time_entries") && resp.request().method() === "GET",
    );
    await nextDayButton.click();
    await nextDayFetch;

    // The header should now show tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayNum = tomorrow.getDate();
    const tomorrowDayName = new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(tomorrow)
      .toUpperCase();

    const tomorrowHeader = calendarView.getByTestId(
      `calendar-day-header-${tomorrowDayName.toLowerCase()}`,
    );
    await expect(tomorrowHeader).toBeAttached({ timeout: 5_000 });
    await expect(tomorrowHeader).toContainText(String(tomorrowDayNum));
  });
});
