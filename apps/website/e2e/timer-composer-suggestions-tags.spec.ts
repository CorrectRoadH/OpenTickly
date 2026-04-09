import { expect, test } from "@playwright/test";

import {
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Tests that the Timer Composer Suggestions dialog shows tag names
 * next to previously tracked time entries and deduplicates entries
 * with the same description + project + tags.
 */

test.describe("Timer Composer Suggestions — Tags", () => {
  test("shows tag names in previously tracked time entries", async ({ page }) => {
    const email = `suggestions-tags-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Tags User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create tags
    const tagId1 = await createTagForWorkspace(page, { name: "focus", workspaceId });
    const tagId2 = await createTagForWorkspace(page, { name: "deep-work", workspaceId });

    // Create a time entry with tags
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(10, 0, 0, 0);
    const stop = new Date(start);
    stop.setHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Tagged work session",
      start: start.toISOString(),
      stop: stop.toISOString(),
      tagIds: [tagId1, tagId2],
      workspaceId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open suggestions dialog
    await page.keyboard.press("n");
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Verify tag names are shown
    await expect(suggestionsDialog).toContainText("Tagged work session");
    await expect(suggestionsDialog).toContainText("focus", { timeout: 5000 });
    await expect(suggestionsDialog).toContainText("deep-work");
  });

  test("deduplicates entries with same description, project, and tags", async ({ page }) => {
    const email = `suggestions-dedup-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Dedup User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    const tagId = await createTagForWorkspace(page, { name: "daily", workspaceId });

    // Create 5 identical entries (same description, no project, same tag)
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const start = new Date(now);
      start.setDate(start.getDate() - i - 1);
      start.setHours(9, 0, 0, 0);
      const stop = new Date(start);
      stop.setHours(10, 0, 0, 0);

      await createTimeEntryForWorkspace(page, {
        description: "Daily standup",
        start: start.toISOString(),
        stop: stop.toISOString(),
        tagIds: [tagId],
        workspaceId,
      });
    }

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open suggestions dialog
    await page.keyboard.press("n");
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // "Daily standup" should appear exactly once (deduplicated)
    const rows = suggestionsDialog.locator("button", { hasText: "Daily standup" });
    await expect(rows).toHaveCount(1, { timeout: 5000 });

    // And it should show the tag
    await expect(suggestionsDialog).toContainText("daily");
  });
});
