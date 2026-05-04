import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Tests for the Timer Composer Suggestions feature.
 *
 * When the user focuses on the description input in the timer header
 * (without a running timer and without project/tags selected),
 * a suggestions dialog appears showing:
 * - Favorites
 * - Previously tracked time entries
 * - Projects
 */

test.describe("Timer Composer Suggestions", () => {
  test("timer page loads recent suggestions without naked history query", async ({ page }) => {
    const email = `suggestions-network-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Network Test User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const timeEntryRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (request.method() === "GET" && url.includes("/api/v9/me/time_entries")) {
        timeEntryRequests.push(url);
      }
    });

    const suggestionsResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/web/v1/workspaces/") &&
        response.url().includes("/time-entries/recent-suggestions") &&
        response.status() === 200,
    );

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await suggestionsResponse;

    const nakedHistoryQueries = timeEntryRequests.filter((url) => {
      const requestUrl = new URL(url);
      return (
        requestUrl.searchParams.get("meta") === "true" &&
        !requestUrl.searchParams.has("start_date") &&
        !requestUrl.searchParams.has("end_date")
      );
    });
    expect(nakedHistoryQueries).toEqual([]);
  });

  /**
   * Test that the suggestions dialog appears when focusing on the description input
   * and that it shows previously created time entries from several weeks ago.
   * This reproduces the bug where older entries don't appear in suggestions.
   */
  test("suggestions dialog appears and shows time entries from several weeks ago", async ({
    page,
  }) => {
    const email = `suggestions-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Test User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create time entries from several weeks ago
    // Using fixed dates to ensure they're old enough to test the bug
    const now = new Date();

    // Entry from 3 weeks ago
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    threeWeeksAgo.setHours(10, 0, 0, 0);
    const threeWeeksAgoStop = new Date(threeWeeksAgo);
    threeWeeksAgoStop.setHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "给肖建飞",
      start: threeWeeksAgo.toISOString(),
      stop: threeWeeksAgoStop.toISOString(),
      workspaceId,
    });

    // Entry from 2 weeks ago
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(14, 0, 0, 0);
    const twoWeeksAgoStop = new Date(twoWeeksAgo);
    twoWeeksAgoStop.setHours(15, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Meeting with team",
      start: twoWeeksAgo.toISOString(),
      stop: twoWeeksAgoStop.toISOString(),
      workspaceId,
    });

    // Entry from 1 week ago
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(9, 0, 0, 0);
    const oneWeekAgoStop = new Date(oneWeekAgo);
    oneWeekAgoStop.setHours(10, 30, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Code review for PR #123",
      start: oneWeekAgo.toISOString(),
      stop: oneWeekAgoStop.toISOString(),
      workspaceId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Focus on the description input by pressing 'n' (global shortcut)
    await page.keyboard.press("n");

    // Wait for the suggestions dialog to appear
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Verify that the suggestions dialog shows the "Previously tracked time entries" section
    // Use auto-retrying assertions since entries load asynchronously
    await expect(suggestionsDialog).toContainText("Previously tracked time entries", {
      timeout: 5000,
    });

    // Verify that older entries (from 3 weeks ago) appear in suggestions
    // This is the key assertion for the bug - "给肖建飞" should be findable
    await expect(suggestionsDialog).toContainText("给肖建飞");
  });

  /**
   * Test that typing in the description input filters older time entries.
   */
  test("can filter suggestions to find older time entries by typing", async ({ page }) => {
    const email = `suggestions-filter-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Filter Test User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create time entries from several weeks ago
    const now = new Date();

    // Entry from 4 weeks ago
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    fourWeeksAgo.setHours(10, 0, 0, 0);
    const fourWeeksAgoStop = new Date(fourWeeksAgo);
    fourWeeksAgoStop.setHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "给肖建飞",
      start: fourWeeksAgo.toISOString(),
      stop: fourWeeksAgoStop.toISOString(),
      workspaceId,
    });

    // Entry from 3 weeks ago (more recent)
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    threeWeeksAgo.setHours(14, 0, 0, 0);
    const threeWeeksAgoStop = new Date(threeWeeksAgo);
    threeWeeksAgoStop.setHours(15, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Another completely different task",
      start: threeWeeksAgo.toISOString(),
      stop: threeWeeksAgoStop.toISOString(),
      workspaceId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Focus on the description input
    await page.keyboard.press("n");

    // Wait for the suggestions dialog to appear
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Type in the description input to filter for the older entry
    const descriptionInput = page.getByLabel("Time entry description");
    await descriptionInput.fill("肖");

    // The suggestions should be filtered to show only matching entries
    await expect(suggestionsDialog).toContainText("给肖建飞");
    await expect(suggestionsDialog).not.toContainText("Another completely different task");
  });
});
