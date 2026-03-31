import { expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";

/**
 * Mobile calendar: cross-day (overnight) time entries.
 *
 * A time entry spanning midnight (e.g. 22:00 → 02:00) should appear on both
 * days in the mobile day timeline:
 *   - Start day: block from 22:00 to the bottom (midnight)
 *   - Next day: block from the top (midnight) to 02:00
 */
test.describe("Mobile calendar: cross-day entries", () => {
  let workspaceId: number;
  const description = `mobile-overnight-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    const email = `m-cross-day-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Cross Day User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create an entry that spans midnight: today 22:00 → tomorrow 02:00
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
      workspaceId,
    });
  });

  test("Cross-midnight entry is visible on the start day's calendar", async ({ page }) => {
    await page.goto(new URL("/m/calendar", page.url()).toString());

    // The entry should be visible on today (the start day)
    await expect(page.getByText(description)).toBeVisible({ timeout: 10_000 });
  });

  test("Cross-midnight entry is also visible on the next day's calendar", async ({ page }) => {
    await page.goto(new URL("/m/calendar", page.url()).toString());

    // Verify it's visible today first
    await expect(page.getByText(description)).toBeVisible({ timeout: 10_000 });

    // Navigate to the next day via the day strip.
    // Day strip buttons contain the day-of-week abbreviation and date number.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const tomorrowLabel = tomorrowDayNames[tomorrow.getDay()];

    // Click the button that contains both the day name and date number
    await page
      .locator("button")
      .filter({ hasText: tomorrowLabel })
      .filter({ hasText: String(tomorrow.getDate()) })
      .click();

    // The entry should also be visible on the next day
    await expect(page.getByText(description)).toBeVisible({ timeout: 10_000 });
  });
});
