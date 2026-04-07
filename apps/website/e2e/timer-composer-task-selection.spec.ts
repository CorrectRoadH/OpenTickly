import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTaskForProject,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { pollCurrentRunningEntry } from "./fixtures/e2e-api.ts";

/**
 * Tests for task selection in the Timer Composer Suggestions dialog.
 *
 * Tasks are sub-items of projects. When a project has tasks, the suggestions
 * dialog should show them in "projectName | taskName" format, and selecting
 * a task should set both the project and task on the draft/running entry.
 */

test.describe("Timer Composer Task Selection", () => {
  test("suggestions dialog shows tasks under projects as 'projectName | taskName'", async ({
    page,
  }) => {
    const email = `task-suggest-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Task Suggest User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create a project with two tasks
    const projectId = await createProjectForWorkspace(page, {
      name: "Frontend",
      workspaceId,
    });
    await createTaskForProject(page, {
      name: "Fix login bug",
      projectId,
      workspaceId,
    });
    await createTaskForProject(page, {
      name: "Add dark mode",
      projectId,
      workspaceId,
    });

    // Navigate to timer page
    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open suggestions dialog
    await page.keyboard.press("n");
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Should show tasks in "projectName | taskName" format
    await expect(suggestionsDialog).toContainText("Frontend | Fix login bug", { timeout: 5000 });
    await expect(suggestionsDialog).toContainText("Frontend | Add dark mode");
  });

  test("selecting a task sets both project and task on the timer", async ({ page }) => {
    const email = `task-select-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Task Select User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create a project with a task
    const projectId = await createProjectForWorkspace(page, {
      name: "Backend",
      workspaceId,
    });
    await createTaskForProject(page, {
      name: "Optimize queries",
      projectId,
      workspaceId,
    });

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open suggestions and select the task
    await page.keyboard.press("n");
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // Click the task suggestion
    await suggestionsDialog.getByText("Backend | Optimize queries").click();

    // The suggestions dialog should close
    await expect(suggestionsDialog).not.toBeVisible();

    // The project picker should show "Backend" as selected
    await expect(page.getByRole("button", { name: /Backend/ })).toBeVisible();

    // Start the timer and verify the running entry has the correct task
    await page.keyboard.press("n");
    const descriptionInput = page.getByLabel("Time entry description");
    await descriptionInput.fill("Working on queries");
    // Press Enter or click the start button to start timer
    await descriptionInput.press("Enter");

    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.project_id).toBe(projectId);
    expect(entry.task_id).toBeTruthy();
  });

  test("continuing a time entry with a task preserves the task", async ({ page }) => {
    const email = `task-continue-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Task Continue User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Create project and task
    const projectId = await createProjectForWorkspace(page, {
      name: "DevOps",
      workspaceId,
    });
    const taskId = await createTaskForProject(page, {
      name: "Setup CI",
      projectId,
      workspaceId,
    });

    // Create a stopped time entry with the task
    const now = new Date();
    const stop = new Date(now);
    stop.setHours(stop.getHours() - 1);
    const start = new Date(stop);
    start.setHours(start.getHours() - 1);

    await page.evaluate(
      async (request) => {
        const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/time_entries`, {
          body: JSON.stringify({
            created_with: "playwright-e2e",
            description: "CI pipeline work",
            duration: 3600,
            project_id: request.projectId,
            task_id: request.taskId,
            start: request.start,
            stop: request.stop,
            workspace_id: request.workspaceId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) throw new Error(`Create time entry failed with ${response.status}`);
      },
      { projectId, taskId, workspaceId, start: start.toISOString(), stop: stop.toISOString() },
    );

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open suggestions - the previous entry should show with task info
    await page.keyboard.press("n");
    const suggestionsDialog = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestionsDialog).toBeVisible({ timeout: 5000 });

    // The previous entry should show "DevOps | Setup CI" as subtitle
    await expect(suggestionsDialog).toContainText("DevOps | Setup CI", { timeout: 5000 });
  });
});
