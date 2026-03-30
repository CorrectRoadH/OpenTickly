import { expect, test } from "@playwright/test";

import { createProjectForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

async function pinProject(
  page: import("@playwright/test").Page,
  options: { projectId: number; workspaceId: number },
): Promise<void> {
  await page.evaluate(async (request) => {
    const response = await fetch(
      `/api/v9/workspaces/${request.workspaceId}/projects/${request.projectId}/pin`,
      {
        body: JSON.stringify({ pin: true }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    if (!response.ok) {
      throw new Error(`Pin project failed with ${response.status}`);
    }
  }, options);
}

test.describe("Pinned projects", () => {
  test("directory table: pinned row shows visible pin icon, unpinned hides until hover", async ({
    page,
  }) => {
    const email = `pin-icon-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Pin Icon User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    const pinnedId = await createProjectForWorkspace(page, {
      name: "Pinned Project",
      workspaceId,
    });
    await createProjectForWorkspace(page, {
      name: "Unpinned Project",
      workspaceId,
    });

    await pinProject(page, { projectId: pinnedId, workspaceId });

    await page.goto(new URL(`/projects/${workspaceId}/list?status=all`, page.url()).toString());
    await expect(page.getByTestId("projects-list")).toBeVisible();

    // The "Unpin Pinned Project" button should always be visible (not hidden)
    const pinnedButton = page.getByRole("button", { name: "Unpin Pinned Project" });
    await expect(pinnedButton).toBeVisible();
    await expect(pinnedButton).not.toHaveCSS("opacity", "0");

    // The "Pin Unpinned Project" button should be hidden until hover (opacity-0)
    const unpinnedButton = page.getByRole("button", { name: "Pin Unpinned Project" });
    await expect(unpinnedButton).toHaveCSS("opacity", "0");

    // After hovering the row, the pin button becomes visible
    // The row is the parent grid div of the button
    const unpinnedRow = unpinnedButton.locator("xpath=ancestor::div[contains(@class,'grid')]");
    await unpinnedRow.hover();
    await expect(unpinnedButton).toHaveCSS("opacity", "1");
  });

  test("project picker: pinned projects show a pin icon next to their name", async ({ page }) => {
    const email = `pin-picker-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Pin Picker User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createProjectForWorkspace(page, { name: "AAA Unpinned", workspaceId });
    const bbbId = await createProjectForWorkspace(page, { name: "BBB Pinned", workspaceId });

    await pinProject(page, { projectId: bbbId, workspaceId });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open the timer bar project picker
    await page.getByRole("button", { name: /Add a project/ }).click();
    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    // The pinned project button should contain a pin icon (svg with data-testid or aria)
    const pinnedProjectButton = picker.locator("button").filter({ hasText: "BBB Pinned" });
    await expect(pinnedProjectButton).toBeVisible();
    await expect(pinnedProjectButton.locator('[data-testid="pin-icon"]')).toBeVisible();

    // The unpinned project should NOT have a pin icon
    const unpinnedProjectButton = picker.locator("button").filter({ hasText: "AAA Unpinned" });
    await expect(unpinnedProjectButton).toBeVisible();
    await expect(unpinnedProjectButton.locator('[data-testid="pin-icon"]')).not.toBeVisible();
  });

  test("project picker: pinned projects appear before unpinned", async ({ page }) => {
    const email = `pin-sort-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Pin Sort User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    await createProjectForWorkspace(page, { name: "AAA Unpinned", workspaceId });
    const bbbId = await createProjectForWorkspace(page, { name: "BBB Pinned", workspaceId });
    await createProjectForWorkspace(page, { name: "CCC Unpinned", workspaceId });

    await pinProject(page, { projectId: bbbId, workspaceId });

    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    await page.getByRole("button", { name: /Add a project/ }).click();
    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    const projectButtons = picker.locator("button");
    await expect(projectButtons.first()).toBeVisible();
    const allTexts = await projectButtons.allTextContents();

    const testProjectNames = allTexts.filter(
      (text) =>
        text.includes("AAA Unpinned") ||
        text.includes("BBB Pinned") ||
        text.includes("CCC Unpinned"),
    );

    expect(testProjectNames).toHaveLength(3);

    const bbbIndex = testProjectNames.findIndex((n) => n.includes("BBB Pinned"));
    const aaaIndex = testProjectNames.findIndex((n) => n.includes("AAA Unpinned"));
    const cccIndex = testProjectNames.findIndex((n) => n.includes("CCC Unpinned"));

    expect(bbbIndex).toBeLessThan(aaaIndex);
    expect(bbbIndex).toBeLessThan(cccIndex);
  });
});
