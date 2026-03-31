import { expect, test } from "@playwright/test";

import { createProjectForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: timer bar project picker search and archived filtering", () => {
  const ACTIVE_PROJECT = "Active Design Work";
  const ARCHIVED_PROJECT = "Archived Legacy App";

  let workspaceId: number;

  test.beforeEach(async ({ page }) => {
    const email = `timer-picker-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Picker User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    // Create an active project
    await createProjectForWorkspace(page, {
      name: ACTIVE_PROJECT,
      workspaceId,
    });

    // Create a project then archive it
    const archivedProjectId = await createProjectForWorkspace(page, {
      name: ARCHIVED_PROJECT,
      workspaceId,
    });
    await archiveProject(page, { projectId: archivedProjectId, workspaceId });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  });

  test("when the user starts a timer and searches in the project picker, the search input is focusable and archived projects are excluded", async ({
    page,
  }) => {
    // Start a timer
    await page.getByLabel("Time entry description").fill("Test entry");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    // Open the project picker
    await page.getByLabel("Add a project").click();
    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    // Click the search input — it should be focusable
    const searchInput = picker.locator('input[placeholder*="Search"]');
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // Type a search query and verify filtering works
    await searchInput.fill("Design");
    await expect(picker.getByText(ACTIVE_PROJECT)).toBeVisible();

    // Archived project should not appear (even without search filter)
    await searchInput.fill("");
    await expect(picker.getByText(ACTIVE_PROJECT)).toBeVisible();
    await expect(picker.getByText(ARCHIVED_PROJECT)).not.toBeVisible();

    // Select the active project via search
    await searchInput.fill("Active");
    await picker.getByText(ACTIVE_PROJECT).click();

    // Verify the project is now shown on the timer bar
    await expect(page.getByLabel(/Add a project.*Active Design Work/)).toBeVisible();

    // Stop the timer
    await page.getByRole("button", { name: "Stop timer" }).click();
  });

  test("when the user clears an existing project selection with No Project, the timer bar returns to the empty project state", async ({
    page,
  }) => {
    await page.getByLabel("Time entry description").fill("Project clearing regression");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

    await page.getByLabel("Add a project").click();
    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();
    await picker.getByText(ACTIVE_PROJECT).click();

    await expect(page.getByLabel(`Add a project: ${ACTIVE_PROJECT}`)).toBeVisible();

    await page.getByLabel(`Add a project: ${ACTIVE_PROJECT}`).click();
    await expect(picker).toBeVisible();
    await picker.getByText("No Project").click();

    await expect(page.getByLabel("Add a project")).toBeVisible();
  });
});

async function archiveProject(
  page: import("@playwright/test").Page,
  options: { projectId: number; workspaceId: number },
): Promise<void> {
  await page.evaluate(async ({ projectId, workspaceId }) => {
    const response = await fetch(`/api/v9/workspaces/${workspaceId}/projects/${projectId}`, {
      body: JSON.stringify({ active: false }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Archive project failed with ${response.status}`);
    }
  }, options);
}
