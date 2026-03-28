import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Creates a time entry visible on this week's calendar, registers/logs in
 * a fresh user, and navigates to the timer page in calendar view.
 * Returns with the calendar entry scrolled into view.
 */
async function setupCalendarWithEntry(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  description: string,
) {
  const email = `ctx-menu-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "Context Menu User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, testInfo, { email, password });

  // Create a stopped time entry for today so it appears on the calendar
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const stop = new Date(now);
  stop.setHours(11, 0, 0, 0);

  await createTimeEntryForWorkspace(page, {
    description,
    start: start.toISOString(),
    stop: stop.toISOString(),
    workspaceId: session.currentWorkspaceId,
  });

  // Reload to pick up the new entry
  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

  // Ensure calendar view is active
  await page.getByRole("radio", { name: "Calendar" }).click();

  return session;
}

/**
 * Right-click a calendar entry and click a context menu item.
 * Uses evaluate-based click to avoid Playwright viewport issues with position:fixed menus.
 */
async function rightClickAndSelectMenuItem(
  page: import("@playwright/test").Page,
  entry: import("@playwright/test").Locator,
  menuItemName: string,
) {
  // Scroll to top to ensure 10am entry and its context menu fit in viewport
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await entry.scrollIntoViewIfNeeded();
  await entry.click({ button: "right", position: { x: 10, y: 10 } });

  const contextMenu = page.getByTestId("calendar-entry-context-menu");
  await expect(contextMenu).toBeVisible();

  // Use evaluate to click the menu item — avoids "outside of viewport" errors
  // for position:fixed elements that Playwright can't scroll into view
  await contextMenu.getByRole("menuitem", { name: menuItemName }).evaluate(
    (el) => (el as HTMLElement).click(),
  );

  await expect(contextMenu).not.toBeVisible();
}

test.describe("Calendar entry context menu actions", () => {
  test("Duplicate creates a new time entry with same properties", async ({ page }) => {
    const description = `ctx-dup-${Date.now()}`;
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Duplicate");

    // Wait for duplicate to appear on the calendar itself
    const allCalendarEntries = page
      .locator(`[data-testid^="calendar-entry-"]`)
      .filter({ hasText: description });
    await expect(allCalendarEntries).toHaveCount(2, { timeout: 10_000 });
  });

  test("Delete removes the time entry", async ({ page }) => {
    const description = `ctx-del-${Date.now()}`;
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Delete");

    // The entry should disappear from the calendar
    await expect(entry).not.toBeVisible({ timeout: 10_000 });
  });

  test("Copy description writes entry description to clipboard", async ({
    page,
    context,
  }) => {
    const description = `ctx-copy-${Date.now()}`;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Copy description");

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(description);
  });

  test("Copy start link writes a toggl-compatible start link to clipboard", async ({
    page,
    context,
  }) => {
    const description = `ctx-link-${Date.now()}`;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await setupCalendarWithEntry(page, test.info(), description);

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Copy start link");

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // The start link should contain the entry description as URL-encoded parameter
    expect(clipboardText).toContain("description=");
    expect(clipboardText).toContain(encodeURIComponent(description));
  });
});
