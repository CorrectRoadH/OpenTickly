import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

async function setupUserWithEntry(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  description: string,
) {
  const email = `split-${testInfo.workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "Split Test User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, testInfo, { email, password });

  // Create a 2-hour stopped entry for today
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const stop = new Date(now);
  stop.setHours(12, 0, 0, 0);

  await createTimeEntryForWorkspace(page, {
    description,
    start: start.toISOString(),
    stop: stop.toISOString(),
    workspaceId: session.currentWorkspaceId,
  });

  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await page.getByRole("radio", { name: "Calendar" }).click();

  return session;
}

async function rightClickAndSelectMenuItem(
  page: import("@playwright/test").Page,
  entry: import("@playwright/test").Locator,
  menuItemName: string,
) {
  await entry.click({ button: "right", position: { x: 10, y: 10 } });

  const contextMenu = page.getByTestId("calendar-entry-context-menu");
  await expect(contextMenu).toBeVisible();

  await contextMenu
    .getByRole("menuitem", { name: menuItemName })
    .evaluate((el) => (el as HTMLElement).click());

  await expect(contextMenu).not.toBeVisible();
}

test.describe("Split time entry", () => {
  test("Split dialog opens from editor more-actions menu and splits entry", async ({ page }) => {
    const description = `split-editor-${Date.now()}`;
    await setupUserWithEntry(page, test.info(), description);

    // Click the entry to open the editor
    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await entry.scrollIntoViewIfNeeded();
    await entry.click({ position: { x: 10, y: 10 } });

    // Open more-actions menu and click Split
    const moreActionsButton = page.getByRole("button", { name: "Entry actions" });
    await expect(moreActionsButton).toBeVisible();
    await moreActionsButton.click();

    await page.getByRole("menuitem", { name: "Split", exact: true }).click();

    // Verify split dialog is visible
    const splitDialog = page.getByTestId("split-time-entry-dialog");
    await expect(splitDialog).toBeVisible();
    await expect(splitDialog.locator("text=Split Time Entry")).toBeVisible();
    await expect(splitDialog.locator("text=Choose the split time")).toBeVisible();

    // Confirm the split with default midpoint
    await page.getByTestId("split-confirm-button").click();

    // Wait for dialog to close
    await expect(splitDialog).not.toBeVisible({ timeout: 10_000 });

    // Verify via API that two entries now exist with this description
    await expect
      .poll(
        async () => {
          const entries = await page.evaluate(async (desc) => {
            const response = await fetch("/api/v9/me/time_entries", {
              credentials: "include",
            });
            if (!response.ok) return [];
            const all = await response.json();
            return (all as { description?: string }[]).filter((e) => e.description === desc);
          }, description);
          return entries.length;
        },
        { timeout: 10_000 },
      )
      .toBe(2);
  });

  test("Split dialog can be cancelled", async ({ page }) => {
    const description = `split-cancel-${Date.now()}`;
    await setupUserWithEntry(page, test.info(), description);

    const entryLocator = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    await expect(entryLocator).toBeVisible({ timeout: 10_000 });

    // Wait for calendar to stabilize before interacting — re-renders can detach the node
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(500);
    await entryLocator.scrollIntoViewIfNeeded();
    await entryLocator.click({ position: { x: 10, y: 10 } });

    const moreActionsButton = page.getByRole("button", { name: "Entry actions" });
    await expect(moreActionsButton).toBeVisible();
    await moreActionsButton.click();

    await page.getByRole("menuitem", { name: "Split", exact: true }).click();

    const splitDialog = page.getByTestId("split-time-entry-dialog");
    await expect(splitDialog).toBeVisible();

    // Cancel
    await splitDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(splitDialog).not.toBeVisible();

    // Entry should still be just one
    const allEntries = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    await expect(allEntries).toHaveCount(1);
  });

  test("Split from calendar context menu opens dialog and splits", async ({ page }) => {
    const description = `split-ctx-${Date.now()}`;
    await setupUserWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Split");

    // Dialog should open
    const splitDialog = page.getByTestId("split-time-entry-dialog");
    await expect(splitDialog).toBeVisible();

    // Confirm split
    await page.getByTestId("split-confirm-button").click();
    await expect(splitDialog).not.toBeVisible({ timeout: 10_000 });

    // Verify via API that two entries now exist with this description
    await expect
      .poll(
        async () => {
          const entries = await page.evaluate(async (desc) => {
            const response = await fetch("/api/v9/me/time_entries", {
              credentials: "include",
            });
            if (!response.ok) return [];
            const all = await response.json();
            return (all as { description?: string }[]).filter((e) => e.description === desc);
          }, description);
          return entries.length;
        },
        { timeout: 10_000 },
      )
      .toBe(2);
  });
});
