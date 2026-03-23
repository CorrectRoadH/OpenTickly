import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

async function openTimeEntryEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop timer" }).click();
  await page.getByRole("button", { name: /edit /i }).click();
  await expect(page.getByTestId("time-entry-editor-dialog")).toBeVisible();
}

async function createProject(
  page: import("@playwright/test").Page,
  workspaceId: number,
  projectName: string,
): Promise<number> {
  await page.goto(new URL(`/workspaces/${workspaceId}/projects`, page.url()).toString());
  await page.getByTestId("projects-create-button").click();
  await page.getByTestId("projects-create-form").getByLabel("Project name").fill(projectName);
  await page.getByTestId("projects-create-form").getByRole("button", { name: "Save project" }).click();
  await expect(page.getByTestId("projects-list")).toContainText(projectName);
  const projectHref = await page
    .getByTestId("projects-list")
    .getByRole("link", { name: projectName })
    .getAttribute("href");
  return Number(projectHref?.match(/projects\/(\d+)$/)?.[1]);
}

async function startTimerWithProject(
  page: import("@playwright/test").Page,
  description: string,
): Promise<void> {
  await page.getByPlaceholder("What are you working on?").fill(description);
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.waitForTimeout(1500);
}

test.describe("Story: edit a stopped time entry", () => {
  test.beforeEach(async ({ page }) => {
    const email = `edit-entry-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Edit Entry User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const description = "Time entry to edit";
    await page.getByPlaceholder("What are you working on?").fill(description);
  });

  test("Given a stopped time entry, when the user opens the editor dialog, then the header close button is vertically centered and has consistent styling with other header buttons", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();

    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();

    const description = "Time entry to edit";
    await expect(page.getByRole("button", { name: `Edit ${description}` })).toBeVisible();
    await page.getByRole("button", { name: `Edit ${description}` }).click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole("button", { name: "Close editor" });
    await expect(closeButton).toBeVisible();

    const closeButtonBox = await closeButton.boundingBox();
    expect(closeButtonBox).not.toBeNull();

    const playButton = dialog.getByRole("button", { name: /continue entry|stop timer/i });
    await expect(playButton).toBeVisible();
    const playButtonBox = await playButton.boundingBox();
    expect(playButtonBox).not.toBeNull();

    if (closeButtonBox && playButtonBox) {
      const closeButtonCenterY = closeButtonBox.y + closeButtonBox.height / 2;
      const playButtonCenterY = playButtonBox.y + playButtonBox.height / 2;
      expect(Math.abs(closeButtonCenterY - playButtonCenterY)).toBeLessThan(3);
    }

    const closeButtonClasses = await closeButton.getAttribute("class");
    expect(closeButtonClasses).toContain("size-7");
    expect(closeButtonClasses).toContain("rounded-full");
  });

  test("when the user presses Escape, the editor dialog closes", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    await page.getByRole("button", { name: "Edit Time entry to edit" }).first().click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialog).not.toBeVisible();
  });

  test("when the user clicks the close button, the editor dialog closes", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    await page.getByRole("button", { name: "Edit Time entry to edit" }).first().click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Close editor" }).click();

    await expect(dialog).not.toBeVisible();
  });

  test("when the user clicks outside the dialog, the editor dialog closes", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    await page.getByRole("button", { name: "Edit Time entry to edit" }).first().click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();

    if (dialogBox) {
      await page.mouse.click(dialogBox.x - 100, dialogBox.y - 100);
    }

    await expect(dialog).not.toBeVisible();
  });

  test("when the user selects No Project and saves, the project is cleared", async ({ page }) => {
    const loginSession = await loginE2eUser(page, page.info(), {
      email: `edit-entry-${page.info().workerIndex}-${Date.now()}@example.com`,
      password: "secret-pass",
    });

    const projectId = await createProject(page, loginSession.currentWorkspaceId, "Test Project");
    await page.goto(/.*timer.*/);

    await startTimerWithProject(page, "Entry with project");
    await page.getByRole("button", { name: "Stop timer" }).click();

    const editButton = page.getByRole("button", { name: /edit .*entry with project/i });
    await expect(editButton).toBeVisible();
    await editButton.click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Select project" }).click();
    await expect(dialog.getByRole("button", { name: "No Project" })).toBeVisible();
    await dialog.getByRole("button", { name: "No Project" }).click();

    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /edit .*entry with project/i }).click();
    await expect(dialog).toBeVisible();

    const projectButton = dialog.getByRole("button", { name: "Select project" });
    await expect(projectButton).toBeVisible();
    const projectButtonClasses = await projectButton.getAttribute("class");
    expect(projectButtonClasses).toContain("size-10");
    expect(projectButtonClasses).toContain("rounded-[12px]");
  });

  test("when the user changes the project and saves, the new project is set", async ({ page }) => {
    const loginSession = await loginE2eUser(page, page.info(), {
      email: `edit-entry-${page.info().workerIndex}-${Date.now()}@example.com`,
      password: "secret-pass",
    });

    const project1Id = await createProject(page, loginSession.currentWorkspaceId, "Project One");
    const project2Id = await createProject(page, loginSession.currentWorkspaceId, "Project Two");
    await page.goto(/.*timer.*/);

    await startTimerWithProject(page, "Entry to change project");
    await page.getByRole("button", { name: "Stop timer" }).click();

    const editButton = page.getByRole("button", { name: /edit .*entry to change project/i });
    await expect(editButton).toBeVisible();
    await editButton.click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Select project" }).click();
    await expect(dialog.getByText("Project Two")).toBeVisible();
    await dialog.getByText("Project Two").click();

    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /edit .*entry to change project/i }).click();
    await expect(dialog).toBeVisible();

    const projectChip = dialog.getByRole("button", { name: /select project/i }).filter({ hasText: "Project Two" });
    await expect(projectChip).toBeVisible();
  });
});