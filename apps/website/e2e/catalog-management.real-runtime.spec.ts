import { expect, test } from "@playwright/test";

import { loginRuntimeUser, registerRuntimeUser } from "./fixtures/runtime-auth.ts";

test.describe("Story: manage catalog surfaces from the workspace shell", () => {
  test("Given a newly registered account, when the user creates a group, then the group appears in the workspace directory", async ({
    page,
  }) => {
    const email = `groups-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const groupName = `Ops Group ${Date.now()}`;

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Groups Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Groups" }).click();

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

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Tags Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Tags" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/tags$`));
    await expect(page.getByTestId("tags-page")).toBeVisible();

    const form = page.getByTestId("tags-create-form");
    await form.getByLabel("Tag name").fill(tagName);
    await form.getByRole("button", { name: "Save tag" }).click();

    await expect(page.getByText("Tag created")).toBeVisible();
    await expect(page.getByTestId("tags-list")).toContainText(tagName);
    await expect(page.getByTestId("tags-summary")).toContainText(
      `Showing 1 tags in workspace ${workspaceId}.`,
    );
  });

  test("Given a newly registered account, when the user creates a task, then the task appears in the workspace catalog", async ({
    page,
  }) => {
    const email = `tasks-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const taskName = `Design QA ${Date.now()}`;

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Tasks Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Tasks" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/tasks$`));
    await expect(page.getByTestId("tasks-page")).toBeVisible();

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
