import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: update workspace permission policy", () => {
  test("Given a newly registered admin account, when permissions are saved and the page reloads, then the toggles persist", async ({
    page,
  }) => {
    const email = `permission-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Permission Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;
    const permissionPath = `/workspaces/${workspaceId}/permissions`;

    await page.goto(permissionPath);

    await expect(page.getByTestId("permission-config-page")).toBeVisible();

    const form = page.getByTestId("permission-config-form");
    const createProjectsToggle = form.getByLabel("Only admins may create projects");
    const createTagsToggle = form.getByLabel("Only admins may create tags");
    const teamDashboardToggle = form.getByLabel("Only admins see team dashboard");
    const publicProjectDataToggle = form.getByLabel("Limit public project data");

    await expect(createProjectsToggle).not.toBeChecked();
    await expect(createTagsToggle).not.toBeChecked();
    await expect(teamDashboardToggle).not.toBeChecked();
    await expect(publicProjectDataToggle).not.toBeChecked();

    await createProjectsToggle.check();
    await createTagsToggle.check();
    await teamDashboardToggle.check();
    await publicProjectDataToggle.check();

    await form.getByRole("button", { name: "Save permissions" }).click();

    await expect(page.getByText("Permissions saved")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("permission-config-page")).toBeVisible();

    await expect(createProjectsToggle).toBeChecked();
    await expect(createTagsToggle).toBeChecked();
    await expect(teamDashboardToggle).toBeChecked();
    await expect(publicProjectDataToggle).toBeChecked();
  });
});
