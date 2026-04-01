import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Bug reproduction: typing a time entry description in the timer composer
 * should find matching entries even when the user has many entries.
 *
 * Current behavior: only 8 deduplicated entries are shown (via buildPreviousEntries),
 * so entries outside that window are invisible to the client-side filter.
 */

test.describe("Timer Composer Description Search", () => {
  test("finds a time entry by description even when many other entries exist", async ({ page }) => {
    const email = `desc-search-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Description Search User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create 12 entries with different descriptions so that the target entry
    // falls outside the 8-entry window of buildPreviousEntries.
    const now = new Date();
    const descriptions = [
      "Stand-up meeting",
      "Code review session",
      "Deploy staging build",
      "Write unit tests",
      "Fix login bug",
      "Database migration",
      "API documentation",
      "Sprint planning",
      "Design review",
      "Infrastructure monitoring",
      "Performance profiling",
      "特殊的搜索目标条目", // this is the needle we will search for
    ];

    for (let i = 0; i < descriptions.length; i++) {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(8 + i, 0, 0, 0);
      const stop = new Date(start);
      stop.setMinutes(stop.getMinutes() + 30);

      await createTimeEntryForWorkspace(page, {
        description: descriptions[i],
        start: start.toISOString(),
        stop: stop.toISOString(),
        workspaceId,
      });
    }

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Focus on the description input
    await page.keyboard.press("n");

    // Wait for the suggestions dialog to appear
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Type the unique description to search for it
    const descriptionInput = page.getByLabel("Time entry description");
    await descriptionInput.fill("特殊的搜索目标");

    // The matching entry should appear in the suggestions.
    // This is the key assertion: with only client-side filtering of 8 entries,
    // this entry would NOT be found.
    await expect(suggestionsDialog).toContainText("特殊的搜索目标条目", { timeout: 5000 });
  });
});
