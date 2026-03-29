import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: manage catalog surfaces from the workspace shell", () => {
  test("Given a newly registered account, when the user creates a group, then the group appears in the workspace directory", async ({
    page,
  }) => {
    const email = `groups-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const groupName = `Ops Group ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Groups Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.goto(new URL(`/workspaces/${workspaceId}/groups`, page.url()).toString());

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/groups$`));
    await expect(page.getByTestId("groups-page")).toBeVisible();

    const form = page.getByTestId("groups-create-form");
    await form.getByLabel("Group name").fill(groupName);
    await form.getByRole("button", { name: "Save group" }).click();

    await expect(page.getByText("Group created")).toBeVisible();
    await expect(page.getByTestId("groups-list")).toContainText(groupName);
    await expect(page.getByTestId("groups-summary")).toContainText(
      `Showing 1 group for workspace ${workspaceId}`,
    );
  });

  test("Given a newly registered account, when the user creates a tag, then the tag appears in the tracking catalog", async ({
    page,
  }) => {
    const email = `tags-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const tagName = `Urgent ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tags Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Tags" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/tags$`));
    await expect(page.getByTestId("tags-page")).toBeVisible();

    await page.getByTestId("tags-create-button").click();
    const form = page.getByRole("dialog", { name: "Create new tag" });
    await form.getByLabel("Tag name").fill(tagName);
    await form.getByRole("button", { name: "Create tag" }).click();

    await expect(page.getByText("Tag created")).toBeVisible();
    await expect(page.getByTestId("tags-list")).toContainText(tagName);
    await expect(page.getByTestId("tags-summary")).toContainText("Showing 1 tags in");
    await expect(page.getByTestId("tags-summary")).toContainText("Active: 1");
  });

  test("Given a newly registered account, when the user creates a task, then the task appears in the workspace catalog", async ({
    page,
  }) => {
    const email = `tasks-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const projectName = `Task Project ${Date.now()}`;
    const taskName = `Design QA ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Tasks Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${workspaceId}/list(?:\\?status=all)?$`));
    await page.getByTestId("projects-create-button").click();
    const projectForm = page.getByRole("dialog", { name: "Create new project" });
    await projectForm.getByLabel("Project name").fill(projectName);
    await projectForm.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByTestId("projects-list")).toContainText(projectName);
    const projectHref = await page
      .getByTestId("projects-list")
      .getByRole("link", { name: projectName })
      .getAttribute("href");
    const projectId = projectHref?.match(/projects\/(\d+)\/team$/)?.[1];

    expect(projectId).toBeTruthy();
    await page.goto(
      new URL(`/workspaces/${workspaceId}/tasks?projectId=${projectId}`, page.url()).toString(),
    );

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/tasks\\?projectId=\\d+$`));
    await expect(page.getByTestId("tasks-page")).toBeVisible();
    await expect(page.getByTestId("tasks-context-bar")).toBeVisible();

    await page.getByTestId("tasks-create-button").click();
    const form = page.getByTestId("tasks-create-form");
    await form.getByLabel("Task name").fill(taskName);
    await form.getByRole("button", { name: "Save task" }).click();

    await expect(page.getByText("Task created")).toBeVisible();
    await expect(page.getByTestId("tasks-list")).toContainText(taskName);
    await expect(page.getByTestId("tasks-summary")).toContainText(
      `Showing 1 tasks in workspace ${workspaceId}.`,
    );
  });
});
