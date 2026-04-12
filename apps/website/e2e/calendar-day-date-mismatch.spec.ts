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
    // Navigate forward — data may come from React Query cache (no new GET),
    // so rely on Playwright auto-retry assertions below instead of waitForResponse.
    const nextDayButton = page.getByRole("button", { name: /next\s*day/i });
    await nextDayButton.click();

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
    // Place entries on known weekdays within the current 5-day (Mon-Fri) range
    // so the test is reliable regardless of which day of the week CI runs.
    const now = new Date();
    const day = now.getDay(); // 0=Sun … 6=Sat
    // Roll back to this week's Monday (weekStartsOn=1)
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day - 1 + 7) % 7));
    monday.setHours(0, 0, 0, 0);

    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);

    const monDesc = `mon-entry-${Date.now()}`;
    const tueDesc = `tue-entry-${Date.now()}`;

    const email = `fiveday-mismatch-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "FiveDay User",
      password,
    });
    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    const monStart = new Date(monday);
    monStart.setHours(10, 0, 0, 0);
    const monStop = new Date(monday);
    monStop.setHours(11, 0, 0, 0);
    await createTimeEntryForWorkspace(page, {
      description: monDesc,
      start: monStart.toISOString(),
      stop: monStop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    const tueStart = new Date(tuesday);
    tueStart.setHours(14, 0, 0, 0);
    const tueStop = new Date(tuesday);
    tueStop.setHours(15, 0, 0, 0);
    await createTimeEntryForWorkspace(page, {
      description: tueDesc,
      start: tueStart.toISOString(),
      stop: tueStop.toISOString(),
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to Calendar view
    await page.getByRole("radio", { name: "Calendar" }).click();
    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible({ timeout: 10_000 });

    // Monday entry should be visible in week view (default)
    const monEntry = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: monDesc });
    await expect(monEntry).toBeVisible({ timeout: 10_000 });

    // Switch to 5-day view — both entries are Mon & Tue, always within Mon-Fri
    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "5 days view" }).click();

    // Both entries should be visible in the current 5-day range
    await expect(monEntry).toBeVisible({ timeout: 5_000 });
    const tueEntry = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: tueDesc });
    await expect(tueEntry).toBeVisible({ timeout: 5_000 });

    // Navigate forward one week — data may come from cache.
    const nextWeekButton = page.getByRole("button", { name: /next\s*week/i });
    await nextWeekButton.click();

    // After navigating forward one week, neither entry should be visible
    const monEntryAfterNav = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: monDesc });
    const tueEntryAfterNav = calendarView
      .locator(".rbc-time-content")
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: tueDesc });

    await expect(monEntryAfterNav).toHaveCount(0, { timeout: 10_000 });
    await expect(tueEntryAfterNav).toHaveCount(0, { timeout: 10_000 });
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

    // Switch to day view — data may already be cached, so no waitForResponse.
    await page.getByTestId("calendar-subview-select").click();
    await page.getByRole("option", { name: "Day view" }).click();

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

    // Navigate forward one day — data may come from cache.
    const nextDayButton = page.getByRole("button", { name: /next\s*day/i });
    await nextDayButton.click();

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
