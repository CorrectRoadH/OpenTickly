import { expect, test } from "@playwright/test";

import {
  createTimeEntryForWorkspace,
  loginE2eUser,
  pollSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Debug test to understand workspace scoping for suggestions.
 *
 * Problem: /me/time_entries returns entries from HOME workspace only,
 * but user might be on a different current workspace.
 */

test.describe("Timer Composer Suggestions - Workspace Debug", () => {
  test("home workspace entry should appear in suggestions", async ({ page }) => {
    const email = `debug-home-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Debug Home Workspace",
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

    // Get session info
    const bootstrap = await pollSessionBootstrap(page);
    console.log("=== HOME WORKSPACE TEST ===");
    console.log("Current workspace ID from session:", bootstrap?.current_workspace_id);
    console.log("Login returned workspaceId:", workspaceId);
    console.log(
      "Available workspaces:",
      JSON.stringify(bootstrap?.workspaces?.map((w) => ({ id: w.id, name: w.name }))),
    );

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Focus on description input
    await page.keyboard.press("n");

    // Wait for suggestions dialog
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Should show the entry
    const content = await suggestionsDialog.textContent();
    console.log(
      "Suggestions contains 'Home workspace entry':",
      content?.includes("Home workspace entry"),
    );
    expect(content).toContain("Home workspace entry");
  });

  test("check workspace switching scenario", async ({ page }) => {
    const email = `debug-switch-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Debug Switch Workspace",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Check how many workspaces this user has
    const bootstrap = await pollSessionBootstrap(page);
    console.log("=== WORKSPACE SWITCH TEST ===");
    console.log("User's workspaces:", JSON.stringify(bootstrap?.workspaces));
    console.log("Current (home) workspace:", workspaceId);

    // If user only has 1 workspace, this test won't reproduce the issue
    const workspaceCount = bootstrap?.workspaces?.length ?? 0;
    console.log("Number of workspaces:", workspaceCount);

    if (workspaceCount < 2) {
      console.log("User only has 1 workspace - cannot test workspace switching issue");
    }
  });
});
