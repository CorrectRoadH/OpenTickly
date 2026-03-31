import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe("Story: clear project from time entry editor", () => {
  const ENTRY_DESCRIPTION = "Editor project clear regression";
  const PROJECT_NAME = `Editor Project ${Date.now()}`;

  let workspaceId: number;

  test.beforeEach(async ({ page }) => {
    const email = `editor-project-clear-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Editor Project Clear User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    workspaceId = session.currentWorkspaceId;

    const projectId = await createProjectForWorkspace(page, {
      name: PROJECT_NAME,
      workspaceId,
    });

    const today = todayISO();
    await createTimeEntryForWorkspace(page, {
      description: ENTRY_DESCRIPTION,
      projectId,
      start: `${today}T10:00:00Z`,
      stop: `${today}T10:30:00Z`,
      workspaceId,
    });

    await page.reload();
    await expect(page.getByRole("button", { name: ENTRY_DESCRIPTION }).first()).toBeVisible();
  });

  test("when the user selects No Project in the editor and saves, the cleared project persists", async ({
    page,
  }) => {
    await page.getByRole("button", { name: ENTRY_DESCRIPTION }).first().click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const projectButton = dialog.getByLabel("Select project");
    await expect(projectButton).toContainText(PROJECT_NAME);

    await projectButton.click();
    const picker = dialog.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();
    await picker.getByText("No Project").click();
    await expect(projectButton).not.toContainText(PROJECT_NAME);

    const saveRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/time_entries/") &&
        request.method() === "PUT" &&
        request.postDataJSON()?.project_id === null,
    );

    await dialog.getByRole("button", { name: "Save" }).click();
    await saveRequestPromise;
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: ENTRY_DESCRIPTION }).first().click();
    const reopenedDialog = page.getByTestId("time-entry-editor-dialog");
    await expect(reopenedDialog).toBeVisible();
    await expect(reopenedDialog.getByLabel("Select project")).not.toContainText(PROJECT_NAME);
  });
});
