import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTaskForProject,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { pollCurrentRunningEntry } from "./fixtures/e2e-api.ts";

test.describe("Bug fix: timer project picker can select tasks", () => {
  test("when the user searches by task in the timer project picker, selecting it sets both project and task", async ({
    page,
  }) => {
    const email = `timer-project-task-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Project Task User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    const projectName = `Composer Host ${Date.now()}`;
    const projectId = await createProjectForWorkspace(page, {
      name: projectName,
      workspaceId,
    });
    const taskToken = `composer-task-${test.info().workerIndex}-${Date.now()}`;
    const taskName = `${taskToken}-subtask`;
    await createTaskForProject(page, {
      name: taskName,
      projectId,
      workspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    await page.getByRole("button", { name: "Add a project" }).click();

    const picker = page.getByTestId("bulk-edit-project-picker");
    await expect(picker).toBeVisible();

    const searchInput = picker.getByPlaceholder("Search by project, task or client");
    await searchInput.click();
    await page.keyboard.type(taskToken);

    const taskButton = picker.getByRole("button", {
      name: new RegExp(`${projectName}\\s*\\|\\s*${taskName}`),
    });
    await expect(taskButton).toBeVisible();
    await taskButton.click();

    const selectedProjectButton = page.getByRole("button", {
      name: new RegExp(`Add a project: ${projectName}`),
    });
    await expect(selectedProjectButton).toContainText(`${projectName} | ${taskName}`);

    const descriptionInput = page.getByLabel("Time entry description");
    await descriptionInput.fill("Timer project picker task selection");
    await descriptionInput.press("Enter");

    const { body: runningEntry } = await pollCurrentRunningEntry(page);
    expect(runningEntry).not.toBeNull();
    expect(runningEntry.project_id).toBe(projectId);
    expect(runningEntry.task_id).toBeTruthy();
  });
});
