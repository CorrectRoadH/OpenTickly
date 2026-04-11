import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: manage account and tenant settings from the shell", () => {
  test("Given a newly registered account, when the user opens profile and reloads, then the profile details surface stays available", async ({
    page,
  }) => {
    const email = `profile-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
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
    await expect(
      page.getByRole("heading", { name: "Personal details & preferences" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "API Token" })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Personal details & preferences" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "API Token" })).toBeVisible();
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

    // Sonner toast shows the message directly (no separate title)
    await expect(page.getByText("Your workspace has been updated")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
    await expect(workspaceForm.getByLabel("Workspace name")).toHaveValue(workspaceName);
    await expect(page.getByRole("heading", { name: "Team member rights" })).toBeVisible();

    await page.getByRole("link", { name: "CSV import" }).click();
    await expect(page).toHaveURL(new RegExp(`/${workspaceId}/settings/import$`));
    await expect(page.getByRole("heading", { name: "CSV Import" })).toBeVisible();

    await page.goto(
      new URL(`/workspaces/${workspaceId}/settings?section=general`, page.url()).toString(),
    );
    await expect(page).toHaveURL(new RegExp(`/${workspaceId}/settings/general$`));
  });
});
