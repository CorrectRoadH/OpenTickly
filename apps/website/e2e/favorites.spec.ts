import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

async function setupUserWithEntry(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  description: string,
) {
  const email = `fav-${testInfo.workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "Favorites User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, testInfo, { email, password });

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

  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

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

test.describe("Favorites", () => {
  test("Pin as favorite from context menu adds entry to favorites API", async ({ page }) => {
    const description = `fav-pin-${Date.now()}`;
    const session = await setupUserWithEntry(page, test.info(), description);

    await page.getByRole("radio", { name: "Calendar" }).click();

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await rightClickAndSelectMenuItem(page, entry, "Pin as favorite");

    // Verify the favorite was created via API
    await expect
      .poll(
        async () => {
          const favs = await page.evaluate(async (wid) => {
            const response = await fetch(`/api/v9/workspaces/${wid}/favorites`, {
              credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
          }, session.currentWorkspaceId);
          return (favs as { description?: string }[]).some((f) => f.description === description);
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });

  test("Pin as favorite from editor more-actions creates favorite", async ({ page }) => {
    const description = `fav-editor-${Date.now()}`;
    const session = await setupUserWithEntry(page, test.info(), description);

    await page.getByRole("radio", { name: "Calendar" }).click();

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await entry.scrollIntoViewIfNeeded();
    await entry.click({ position: { x: 10, y: 10 } });

    const moreActionsButton = page.getByRole("button", { name: "Entry actions" });
    await expect(moreActionsButton).toBeVisible();
    await moreActionsButton.click();

    await page.getByRole("button", { name: "Pin as favorite" }).click();

    // Verify via API
    await expect
      .poll(
        async () => {
          const favs = await page.evaluate(async (wid) => {
            const response = await fetch(`/api/v9/workspaces/${wid}/favorites`, {
              credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
          }, session.currentWorkspaceId);
          return (favs as { description?: string }[]).some((f) => f.description === description);
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });

  test("Delete a favorite via API removes it", async ({ page }) => {
    const description = `fav-del-${Date.now()}`;
    const session = await setupUserWithEntry(page, test.info(), description);

    await page.getByRole("radio", { name: "Calendar" }).click();

    const entry = page.locator(`[data-testid^="calendar-entry-"]`).filter({ hasText: description });
    await expect(entry).toBeVisible({ timeout: 10_000 });

    // Pin it first
    await rightClickAndSelectMenuItem(page, entry, "Pin as favorite");

    // Wait for favorite to be created
    let favoriteId = 0;
    await expect
      .poll(
        async () => {
          const favs = await page.evaluate(async (wid) => {
            const response = await fetch(`/api/v9/workspaces/${wid}/favorites`, {
              credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
          }, session.currentWorkspaceId);
          const found = (favs as { description?: string; favorite_id?: number }[]).find(
            (f) => f.description === description,
          );
          if (found?.favorite_id) favoriteId = found.favorite_id;
          return Boolean(found);
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    // Delete it via API
    await page.evaluate(
      async ({ wid, fid }) => {
        await fetch(`/api/v9/workspaces/${wid}/favorites/${fid}`, {
          credentials: "include",
          method: "DELETE",
        });
      },
      { wid: session.currentWorkspaceId, fid: favoriteId },
    );

    // Verify it's gone
    await expect
      .poll(
        async () => {
          const favs = await page.evaluate(async (wid) => {
            const response = await fetch(`/api/v9/workspaces/${wid}/favorites`, {
              credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
          }, session.currentWorkspaceId);
          return (favs as { description?: string }[]).some((f) => f.description === description);
        },
        { timeout: 10_000 },
      )
      .toBe(false);
  });
});
