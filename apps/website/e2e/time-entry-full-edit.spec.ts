import { expect, test } from "@playwright/test";

import { createProjectForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";
import { expectedDuration } from "./fixtures/e2e-format.ts";

/**
 * Story: A user edits a time entry from the calendar view, changing its
 * description, project, tags, billable status, start/stop times, and saves.
 *
 * This is the highest-frequency user flow in the app — every tracking
 * session involves opening the editor and adjusting at least one field.
 */
test.describe("Story: full time entry editing from calendar", () => {
  const INITIAL_DESCRIPTION = "Initial task";
  const PROJECT_NAME = `Project-${Date.now()}`;

  let workspaceId: number;

  test.beforeEach(async ({ page }) => {
    const email = `full-edit-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Full Edit User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Seed: create a project and a stopped time entry
    await createProjectForWorkspace(page, {
      name: PROJECT_NAME,
      workspaceId,
    });

    await createTagForWorkspace(page, { name: "urgent", workspaceId });

    await createStoppedTimeEntry(page, {
      description: INITIAL_DESCRIPTION,
      start: "2026-03-23T09:00:00Z",
      stop: "2026-03-23T10:00:00Z",
      workspaceId,
    });

    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
  });

  test("when the user selects a project in the editor, the project is saved and visible after reload", async ({
    page,
  }) => {
    // Open the editor
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Click the project picker
    await dialog.getByLabel("Select project").click();

    // Search for the project
    const searchInput = dialog.locator('input[placeholder*="Search"]');
    await searchInput.fill(PROJECT_NAME.substring(0, 8));

    // Select the project
    await dialog.getByText(PROJECT_NAME).click();

    // Project should now show in the picker button
    await expect(dialog.getByLabel("Select project")).toContainText(PROJECT_NAME);

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    // Verify: reload and reopen — project must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    await expect(page.getByTestId("time-entry-editor-dialog")).toBeVisible();
    await expect(
      page.getByTestId("time-entry-editor-dialog").getByLabel("Select project"),
    ).toContainText(PROJECT_NAME);
  });

  test("when the user selects a tag in the editor, the tag is saved and visible after reload", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Open tag picker
    await dialog.getByLabel("Select tags").click();

    // Select the "urgent" tag
    await dialog.getByText("urgent").click();

    // Tag should show in the picker button
    await expect(dialog.getByLabel("Select tags")).toContainText("urgent");

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    // Verify: reload and reopen — tag must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    await expect(page.getByTestId("time-entry-editor-dialog")).toBeVisible();
    await expect(
      page.getByTestId("time-entry-editor-dialog").getByLabel("Select tags"),
    ).toContainText("urgent");
  });

  test("when the user toggles billable and edits the stop time, both changes are saved", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Toggle billable
    await dialog.getByLabel("Billable").click();

    // Edit stop time: click the stop time button to enter edit mode
    await dialog.getByRole("button", { name: "Edit stop time" }).click();
    const timeInput = dialog.getByLabel("Edit time");
    await timeInput.fill("11:30");
    await timeInput.press("Enter");

    // Duration should update (9:00 to 11:30 = 2h30m)
    await expect(dialog.locator(`text=${expectedDuration(9000)}`)).toBeVisible();

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    // Verify: reload and reopen — billable and stop time must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: INITIAL_DESCRIPTION }).first()).toBeVisible();
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const reopened = page.getByTestId("time-entry-editor-dialog");
    await expect(reopened).toBeVisible();
    await expect(reopened.getByLabel("Billable")).toHaveAttribute("aria-pressed", "true");
    await expect(reopened.getByRole("button", { name: "Edit stop time" })).toContainText("11:30");
  });

  test("when the user changes the description and saves, the new description appears on the calendar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: INITIAL_DESCRIPTION }).first().click();
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    // Clear and type new description
    const descInput = dialog.getByLabel("Time entry description");
    await descInput.fill("Updated task name");

    // Save
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    // The calendar should now show the updated description
    await expect(page.getByRole("button", { name: "Updated task name" }).first()).toBeVisible();

    // Verify: reload — description must persist from the API
    await page.reload();
    await expect(page.getByRole("button", { name: "Updated task name" }).first()).toBeVisible();
  });
});

/**
 * Story: Calendar view interaction details that match Toggl's behavior.
 * These verify the scroll-to-now, context menu persistence, and
 * right-click menu functionality.
 */
test.describe("Story: calendar view interactions", () => {
  test.beforeEach(async ({ page }) => {
    const email = `cal-interact-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Interaction User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });

    await createStoppedTimeEntry(page, {
      description: "Context menu test entry",
      start: "2026-03-23T14:00:00Z",
      stop: "2026-03-23T15:00:00Z",
      workspaceId: session.currentWorkspaceId,
    });

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Context menu test entry" }).first(),
    ).toBeVisible();
  });

  test("when the page loads, the current time indicator is scrolled into the visible area", async ({
    page,
  }) => {
    // The scroll-to-now feature should have scrolled the page so the
    // current time indicator is visible in the viewport.
    const indicator = page.locator(".rbc-current-time-indicator");

    // Indicator may not exist if today isn't in the visible week range,
    // so only assert if it's in the DOM.
    const count = await indicator.count();
    if (count > 0) {
      await indicator.first().waitFor({ state: "visible", timeout: 5000 });
      const box = await indicator.first().boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Should be within the viewport
        expect(box.y).toBeGreaterThan(0);
        expect(box.y).toBeLessThan(await page.evaluate(() => window.innerHeight));
      }
    }
  });

  test("when the user right-clicks a calendar entry, the context menu appears with expected items", async ({
    page,
  }) => {
    const entry = page.getByRole("button", { name: "Context menu test entry" }).first();
    await entry.click({ button: "right" });

    // Context menu should appear with standard items
    const menu = page.getByTestId("calendar-entry-context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByText("Duplicate")).toBeVisible();
    await expect(menu.getByText("Copy description")).toBeVisible();
    await expect(menu.getByText("Delete")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });

  test("when the user right-clicks and waits 3 seconds, the context menu stays open", async ({
    page,
  }) => {
    const entry = page.getByRole("button", { name: "Context menu test entry" }).first();
    await entry.click({ button: "right" });

    const menu = page.getByTestId("calendar-entry-context-menu");
    await expect(menu).toBeVisible();

    // Wait 3 seconds — menu should survive timer ticks (nowMs re-renders)
    await page.waitForTimeout(3000);
    await expect(menu).toBeVisible();
  });
});

// ── Helpers ──

async function createStoppedTimeEntry(
  page: import("@playwright/test").Page,
  options: {
    description: string;
    start: string;
    stop: string;
    workspaceId: number;
  },
): Promise<void> {
  await page.evaluate(async ({ description, start, stop, workspaceId }) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/time_entries`, {
      body: JSON.stringify({
        created_with: "opentoggl-e2e",
        description,
        duration: Math.round((new Date(stop).getTime() - new Date(start).getTime()) / 1000),
        start,
        stop,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to create time entry: ${response.status}`);
    }
  }, options);
}

async function createTagForWorkspace(
  page: import("@playwright/test").Page,
  options: { name: string; workspaceId: number },
): Promise<void> {
  await page.evaluate(async ({ name, workspaceId }) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/tags`, {
      body: JSON.stringify({ name }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to create tag: ${response.status}`);
    }
  }, options);
}
