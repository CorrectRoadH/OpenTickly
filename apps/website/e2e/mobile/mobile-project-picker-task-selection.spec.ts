import { devices, expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTaskForProject,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "../fixtures/e2e-auth.ts";

test.use({ ...devices["iPhone 13"] });

test.describe("Bug fix: mobile project picker can select tasks", () => {
  test("when the user searches by task in the mobile project picker, selecting it saves both project and task", async ({
    page,
  }) => {
    const email = `mobile-project-task-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Mobile Project Task User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    const projectName = `Mobile Host ${Date.now()}`;
    const projectId = await createProjectForWorkspace(page, {
      name: projectName,
      workspaceId,
    });
    const taskToken = `mobile-picker-task-${test.info().workerIndex}-${Date.now()}`;
    const taskName = `${taskToken}-subtask`;
    const taskId = await createTaskForProject(page, {
      name: taskName,
      projectId,
      workspaceId,
    });

    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 14, 0, 0),
    );
    const stop = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0),
    );
    const entryId = await createTimeEntryForWorkspace(page, {
      description: "Mobile project picker task entry",
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });

    await page.goto(new URL("/m/timer", page.url()).toString());
    await expect(
      page.getByRole("button", { name: "Edit Mobile project picker task entry" }).first(),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Edit Mobile project picker task entry" })
      .first()
      .click();

    const editor = page.getByTestId("mobile-time-entry-editor");
    await expect(editor).toBeVisible();
    await editor.getByTestId("mobile-project-trigger").click();

    const projectPicker = page.getByTestId("mobile-project-picker");
    await expect(projectPicker).toBeVisible();
    const searchInput = projectPicker.getByRole("textbox");
    await searchInput.fill(taskToken);

    const taskButton = projectPicker.getByRole("button", {
      name: new RegExp(`${projectName}.*${taskName}`),
    });
    await expect(taskButton).toBeVisible();
    await taskButton.click();

    await expect(editor.getByTestId("mobile-project-trigger")).toContainText(projectName);
    await expect(editor.getByTestId("mobile-project-trigger")).toContainText(taskName);

    const savePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/time_entries/${entryId}`) && resp.request().method() === "PUT",
    );
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(editor).not.toBeVisible();
    await savePromise;

    await expect
      .poll(
        async () => {
          return page.evaluate(async (id) => {
            const response = await fetch(`/api/v9/me/time_entries`, {
              credentials: "include",
            });
            if (!response.ok) return null;
            const payload = (await response.json()) as {
              id?: number;
              project_id?: number | null;
              task_id?: number | null;
            }[];
            const match = payload.find((entry) => entry.id === id);
            if (!match) return null;
            return {
              projectId: match.project_id ?? null,
              taskId: match.task_id ?? null,
            };
          }, entryId);
        },
        { message: "expected the saved mobile time entry to include both project_id and task_id" },
      )
      .toEqual({ projectId, taskId });
  });
});
