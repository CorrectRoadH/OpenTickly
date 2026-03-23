import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: manage account and tenant settings from the shell", () => {
  test("Given a newly registered account, when the user updates profile details, then the profile form keeps the saved values after reload", async ({
    page,
  }) => {
    const email = `profile-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const fullName = `Profile User ${Date.now()}`;
    const timezone = "Asia/Shanghai";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Original Profile User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.goto(new URL("/profile", page.url()).toString());

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await expect(page.getByTestId("api-token-section")).toBeVisible();
    await expect(page.getByTestId("preferences-form-section")).toBeVisible();

    const profileForm = page.getByTestId("profile-form-section");
    await profileForm.getByLabel("Full name").fill(fullName);
    await profileForm.getByLabel("Timezone").fill(timezone);
    await profileForm.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("Profile saved")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await expect(profileForm.getByLabel("Full name")).toHaveValue(fullName);
    await expect(profileForm.getByLabel("Timezone")).toHaveValue(timezone);
  });

  test("Given a newly registered admin account, when the user opens settings, then the route and general settings surface match the new workspace URL shape", async ({
    page,
  }) => {
    const email = `settings-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceName = `Workspace ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Settings Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL(new RegExp(`/${workspaceId}/settings/general$`));
    await expect(page.getByTestId("workspace-settings-page")).toBeVisible();

    const workspaceForm = page.getByTestId("workspace-settings-form");
    await workspaceForm.getByLabel("Workspace name").fill(workspaceName);

    await expect(page.getByTestId("workspace-settings-toast")).toContainText("Success!");
    await expect(page.getByTestId("workspace-settings-toast")).toContainText(
      "Your workspace has been updated",
    );

    await page.reload();
    await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
    await expect(workspaceForm.getByLabel("Workspace name")).toHaveValue(workspaceName);
    await expect(page.getByRole("heading", { name: "Team member rights" })).toBeVisible();

    await page.getByRole("link", { name: "CSV import" }).click();
    await expect(page).toHaveURL(new RegExp(`/${workspaceId}/settings/csv-import$`));
    await expect(page.getByText("CSV import is not available yet")).toBeVisible();

    await page.goto(
      new URL(`/workspaces/${workspaceId}/settings?section=general`, page.url()).toString(),
    );
    await expect(page).toHaveURL(new RegExp(`/${workspaceId}/settings/general$`));
  });
});
