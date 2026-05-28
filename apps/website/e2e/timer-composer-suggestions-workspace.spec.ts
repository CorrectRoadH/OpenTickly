import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Timer composer suggestions workspace scope", () => {
  test("home workspace entry should appear in suggestions", async ({ page }) => {
    const email = `suggestions-home-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Suggestions Home Workspace",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create entry in the home workspace (same as currentWorkspaceId after login)
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 14); // 2 weeks ago
    start.setHours(10, 0, 0, 0);
    const stop = new Date(start);
    stop.setHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Home workspace entry",
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });

    // Navigate to timer page — reload ensures React Query fetches fresh data
    // including the entry created via API above
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Focus on description input
    await page.keyboard.press("n");

    // Wait for suggestions dialog
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Should show the entry created through the API above. Use an auto-retry
    // UI assertion because the suggestions query may still be settling when
    // the dialog first appears.
    await expect(suggestionsDialog).toContainText("Home workspace entry");
  });
});
