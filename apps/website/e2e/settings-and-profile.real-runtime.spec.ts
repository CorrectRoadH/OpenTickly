import { expect, test } from "@playwright/test";

import { loginRuntimeUser, registerRuntimeUser } from "./fixtures/runtime-auth.ts";

test.describe("Story: manage account and tenant settings from the shell", () => {
  test("Given a newly registered account, when the user updates profile details, then the profile form keeps the saved values after reload", async ({
    page,
  }) => {
    const email = `profile-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const fullName = `Profile User ${Date.now()}`;
    const timezone = "Asia/Shanghai";

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Original Profile User",
      password,
    });

    await page.context().clearCookies();
    await loginRuntimeUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Profile" }).click();

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

  test("Given a newly registered admin account, when the user saves workspace settings and opens organization settings, then the saved workspace values persist and the organization form is reachable", async ({
    page,
  }) => {
    const email = `settings-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const workspaceName = `Workspace ${Date.now()}`;

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Settings Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/workspaces/${workspaceId}/settings\\?section=general$`),
    );
    await expect(page.getByTestId("workspace-settings-page")).toBeVisible();

    const workspaceForm = page.getByTestId("workspace-settings-form");
    await workspaceForm.getByLabel("Workspace name").fill(workspaceName);
    await workspaceForm.getByLabel("Default currency").fill("EUR");
    await workspaceForm.getByRole("button", { name: "Save workspace settings" }).click();

    await expect(page.getByText("Workspace settings saved")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
    await expect(workspaceForm.getByLabel("Workspace name")).toHaveValue(workspaceName);
    await expect(workspaceForm.getByLabel("Default currency")).toHaveValue("EUR");
    await expect(page.getByTestId("workspace-settings-header")).toContainText(workspaceName);

    await page.getByRole("link", { name: "Branding" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/workspaces/${workspaceId}/settings\\?section=branding$`),
    );
    await expect(page.getByTestId("workspace-settings-branding-panel")).toBeVisible();

    await page.getByRole("link", { name: "Organization settings" }).click();
    await expect(page).toHaveURL(/\/organizations\/\d+\/settings$/);
    await expect(page.getByTestId("organization-settings-page")).toBeVisible();
    await expect(page.getByTestId("organization-settings-form")).toBeVisible();
  });
});
