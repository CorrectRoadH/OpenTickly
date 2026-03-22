import { expect, test } from "@playwright/test";

import { loginRuntimeUser, registerRuntimeUser } from "./fixtures/runtime-auth.ts";

test.describe("Story: browse the projects surface", () => {
  test("Given a newly registered account, when the user opens projects, then the shell shows creation controls and an empty-state catalog", async ({
    page,
  }) => {
    const email = `project-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Project Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Projects" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/workspaces/${workspaceId}/projects(?:\\?status=all)?$`),
    );
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("projects-filter-bar")).toBeVisible();
    await expect(page.getByTestId("projects-create-form")).toBeVisible();
    await expect(page.getByTestId("projects-empty-state")).toContainText(
      "No projects in this workspace yet.",
    );
    await expect(page.getByTestId("projects-summary")).toContainText(
      `Showing 0 projects in workspace ${workspaceId}.`,
    );
  });
});
