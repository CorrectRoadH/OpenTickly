import { expect, test, type Page } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";
import { selectDropdownOption } from "./fixtures/e2e-select.ts";

const ENTRY_DURATION_SECONDS = 2847; // 47m 27s
const ENTRY_DESCRIPTION = "Preference test entry";

async function changePreferenceSelect(page: Page, testId: string, optionLabel: string) {
  // Start listening before the action to avoid race conditions
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/me/preferences") && response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await selectDropdownOption(page, testId, optionLabel);
  // Autosave debounces at 900ms, then POSTs — wait for the network round-trip
  await responsePromise;
}

/** Switch to list view. */
async function switchToListView(page: Page) {
  await page.getByRole("radio", { name: "List" }).click();
}

/** Find the duration cell in the Timer list view. */
function durationCell(page: Page) {
  return page.getByTestId("time-entry-list-edit-button").first();
}

/** Find the full entry row (includes duration + time range) in the Timer list view. */
function entryRow(page: Page) {
  return page.getByTestId("time-entry-list-row").first();
}

test.describe("Story: user preferences control how times and durations display", () => {
  const email = `prefs-display-${Date.now()}@example.com`;
  const password = "secret-pass";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ timezoneId: "UTC" });

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Preferences Display User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create a time entry with known duration starting at 14:30
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 1);
    start.setUTCHours(14, 30, 0, 0);
    const stop = new Date(start.getTime() + ENTRY_DURATION_SECONDS * 1000);

    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });

    await page.close();
  });

  test("Duration format Improved (default) shows correct format on Timer page", async ({
    page,
  }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await switchToListView(page);
    await expect(durationCell(page)).toContainText("0:47:27");
  });

  test("Duration format Classic shows correct format on Timer page", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-duration-format", "Classic (47:06 min)");

    await page.getByRole("link", { name: "Timer" }).click();
    await switchToListView(page);
    await expect(durationCell(page)).toContainText("47:27 min");
  });

  test("Duration format Decimal shows correct format on Timer page", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-duration-format", "Decimal (0.79 h)");

    await page.getByRole("link", { name: "Timer" }).click();
    await switchToListView(page);
    await expect(durationCell(page)).toContainText("0.79 h");
  });

  test("Time format 24-hour shows correct format on Timer page", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-time-format", "24-hour");

    await page.getByRole("link", { name: "Timer" }).click();
    await switchToListView(page);
    await expect(entryRow(page)).toContainText("14:30");
  });

  test("Time format 24-hour controls the Timer calendar time gutter", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-time-format", "12-hour");
    await changePreferenceSelect(page, "pref-time-format", "24-hour");

    await page.getByRole("link", { name: "Timer" }).click();
    const calendarView = page.getByTestId("timer-calendar-view");
    await expect(calendarView).toBeVisible();
    await expect(
      calendarView.locator(".rbc-time-gutter .rbc-label", { hasText: /^10:00$/ }),
    ).toBeVisible();
    await expect(
      calendarView.locator(".rbc-time-gutter .rbc-label", { hasText: "10:00 AM" }),
    ).toHaveCount(0);
  });

  test("Time format 12-hour shows correct format on Timer page", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });
    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-time-format", "12-hour");

    await page.getByRole("link", { name: "Timer" }).click();
    await switchToListView(page);
    await expect(entryRow(page)).toContainText("2:30");
  });

  test("Preference round-trip survives page reload", async ({ page }) => {
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();
    // Change both preferences — set both before waiting, so debounce merges them into one POST
    await selectDropdownOption(page, "pref-duration-format", "Decimal (0.79 h)");
    await selectDropdownOption(page, "pref-time-format", "24-hour");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/me/preferences") && response.request().method() === "POST",
      { timeout: 15_000 },
    );

    // Reload and verify dropdowns retained
    await page.reload();
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await expect(page.getByTestId("pref-duration-format")).toContainText("Decimal");
    await expect(page.getByTestId("pref-time-format")).toContainText("24-hour");

    // Navigate to Timer and verify formats
    await page.getByRole("link", { name: "Timer" }).click();
    await switchToListView(page);
    await expect(entryRow(page)).toContainText("0.79 h");
  });
});
