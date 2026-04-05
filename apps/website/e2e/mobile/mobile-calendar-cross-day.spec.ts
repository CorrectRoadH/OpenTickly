import { devices, expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";

// Force UTC timezone so local dates match the user's default timezone (UTC).
test.use({ ...devices["iPhone 13"], timezoneId: "UTC" });

/**
 * Mobile calendar: cross-day (overnight) time entries.
 *
 * New users default to UTC timezone. With timezoneId set to "UTC" in the
 * browser, local dates and user-tz dates are the same, avoiding timezone skew.
 *
 * ## Date-boundary resilience
 *
 * Uses `new Date()` ("today") so that over time CI naturally exercises every
 * calendar boundary — week, month, year, leap-year.
 *
 * When today and tomorrow fall in different calendar weeks, the API (which
 * filters by start_time, not overlap) won't return the entry for the next
 * week's day strip. In that case, the test only verifies the today portion.
 */

/** Same-week check — see desktop spec for rationale. */
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

test.describe("Mobile calendar: cross-day entries", () => {
  test("Cross-midnight entry appears on today; when both days are in the same week it also starts at 00:00 on the second day", async ({
    page,
  }) => {
    const email = `m-cross-day-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const description = `mobile-overnight-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Cross Day User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    // Today 22:00 UTC → Tomorrow 02:00 UTC (genuinely crosses midnight in UTC).
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const startStr = `${todayStr}T22:00:00.000Z`;
    const stopStr = `${tomorrowStr}T02:00:00.000Z`;

    await createTimeEntryForWorkspace(page, {
      description,
      start: startStr,
      stop: stopStr,
      workspaceId: session.currentWorkspaceId,
    });

    // Navigate to mobile calendar — today is selected by default.
    await page.goto(new URL("/m/calendar", page.url()).toString());
    await expect(page.getByText("22:00")).toBeVisible({ timeout: 10_000 });

    // Today's column should show the entry (22:00 → midnight segment).
    const entryLocator = page.getByRole("button", { name: description });
    await expect(entryLocator).toBeVisible({ timeout: 10_000 });

    // When both days are in the same calendar week, navigate to tomorrow and
    // verify the entry appears there starting at ~00:00. When they cross a
    // week boundary, the API won't return this entry for the next week's
    // fetch (filters by start_time), so we skip the Day 2 check.
    const bothDaysVisible = sameCalendarWeek(now, tomorrow);

    if (bothDaysVisible) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const tomorrowDow = dayNames[tomorrow.getUTCDay()];
      const tomorrowDayNum = String(tomorrow.getUTCDate());

      await page
        .locator("button")
        .filter({ hasText: tomorrowDow })
        .filter({ hasText: tomorrowDayNum })
        .click();

      // Entry should also be visible on tomorrow
      const nextDayEntry = page.getByRole("button", { name: description });
      await expect(nextDayEntry).toBeVisible({ timeout: 10_000 });

      // On the next day, the entry should start at 00:00 (CSS top ≈ 0px),
      // not at 22:00 (top ≈ 1320px).
      const top = await nextDayEntry.evaluate((el) => {
        return parseFloat((el as HTMLElement).style.top);
      });
      expect(top).toBeLessThan(60);
    }
  });
});
