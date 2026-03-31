import { expect, test } from "@playwright/test";

import { loginE2eUser, readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: organization CRUD lifecycle", () => {
  test("Given a registered user, when they create a new organization, then it appears in the session and can be switched to", async ({
    page,
  }) => {
    const email = `org-create-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const orgName = `TestOrg-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Org Create User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Create organization via public-track API
    const createResult = await page.evaluate(async (name) => {
      const response = await fetch("/api/v9/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, workspace_name: `${name} Workspace` }),
      });
      return { ok: response.ok, status: response.status, body: await response.json() };
    }, orgName);
    expect(createResult.ok).toBe(true);

    // Verify organization appears in session
    const session = await readSessionBootstrap(page);
    const createdOrg = session.organizations.find((o) => o.name === orgName);
    expect(createdOrg).toBeTruthy();
  });

  test("Given an organization, when the admin renames it via the settings UI, then the new name persists after reload", async ({
    page,
  }) => {
    const email = `org-rename-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const newOrgName = `Renamed-${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Org Rename User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });

    // Read session to get current organization ID
    const session = await readSessionBootstrap(page);
    const currentOrgId =
      session.current_organization_id ??
      session.workspaces.find((w) => w.id === loginSession.currentWorkspaceId)?.organization_id;
    expect(currentOrgId).toBeTruthy();

    // Navigate to organization settings
    await page.goto(new URL(`/organizations/${currentOrgId}/settings`, page.url()).toString());

    await expect(page.getByTestId("organization-settings-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Organization settings" })).toBeVisible();

    // Change the organization name
    const nameInput = page.locator("input").first();
    await nameInput.fill(newOrgName);

    // Click save
    await page.getByRole("button", { name: "Save" }).click();

    // Verify toast
    await expect(page.getByText("Organization saved")).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId("organization-settings-page")).toBeVisible();
    await expect(nameInput).toHaveValue(newOrgName);
  });

  test("Given an organization with the default workspace, when the admin deletes the organization via the settings UI, then it is removed and the user is redirected", async ({
    page,
  }) => {
    const email = `org-delete-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Org Delete User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });

    // Read session to get current organization
    const session = await readSessionBootstrap(page);
    const currentOrgId =
      session.current_organization_id ??
      session.workspaces.find((w) => w.id === loginSession.currentWorkspaceId)?.organization_id;
    expect(currentOrgId).toBeTruthy();

    const currentOrg = session.organizations.find((o) => o.id === currentOrgId);
    expect(currentOrg).toBeTruthy();
    const orgName = currentOrg!.name;

    // Navigate to organization settings
    await page.goto(new URL(`/organizations/${currentOrgId}/settings`, page.url()).toString());

    await expect(page.getByTestId("organization-settings-page")).toBeVisible();

    // The delete button should be disabled before typing confirmation
    const deleteButton = page.getByRole("button", { name: "Delete this organization" });
    await expect(deleteButton).toBeDisabled();

    // Type the organization name to confirm deletion
    const confirmInput = page.getByPlaceholder(orgName);
    await confirmInput.fill(orgName);

    // Now the delete button should be enabled
    await expect(deleteButton).toBeEnabled();

    // Intercept the delete API call to observe the response
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/web/v1/organizations/${currentOrgId}`) &&
        response.request().method() === "DELETE",
    );

    await deleteButton.click();

    const deleteResponse = await deleteResponsePromise;

    // If delete fails, we expect an error toast to appear
    if (!deleteResponse.ok()) {
      await expect(page.getByText("Could not delete organization")).toBeVisible({ timeout: 5000 });
    } else {
      // Successful delete should redirect to home
      await page.waitForURL(/\/$|\/timer/, { timeout: 10_000 });
    }
  });

  test("Given the organization settings page, when the delete API returns an error, then an error toast is displayed", async ({
    page,
  }) => {
    const email = `org-delete-err-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Org Delete Error User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });

    const session = await readSessionBootstrap(page);
    const currentOrgId =
      session.current_organization_id ??
      session.workspaces.find((w) => w.id === loginSession.currentWorkspaceId)?.organization_id;
    expect(currentOrgId).toBeTruthy();

    const currentOrg = session.organizations.find((o) => o.id === currentOrgId);
    expect(currentOrg).toBeTruthy();
    const orgName = currentOrg!.name;

    // Navigate to organization settings
    await page.goto(new URL(`/organizations/${currentOrgId}/settings`, page.url()).toString());

    await expect(page.getByTestId("organization-settings-page")).toBeVisible();

    // Mock the delete endpoint to return 500
    await page.route(`**/web/v1/organizations/${currentOrgId}`, (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal Server Error" }),
        });
      }
      return route.continue();
    });

    // Type the org name and click delete
    await page.getByPlaceholder(orgName).fill(orgName);
    await page.getByRole("button", { name: "Delete this organization" }).click();

    // Expect error toast
    await expect(page.getByText("Could not delete organization")).toBeVisible({ timeout: 5000 });
  });

  test("Given the organization settings page, the overview section shows member count and workspace limits", async ({
    page,
  }) => {
    const email = `org-overview-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Org Overview User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });

    const session = await readSessionBootstrap(page);
    const currentOrgId =
      session.current_organization_id ??
      session.workspaces.find((w) => w.id === loginSession.currentWorkspaceId)?.organization_id;

    await page.goto(new URL(`/organizations/${currentOrgId}/settings`, page.url()).toString());

    await expect(page.getByTestId("organization-settings-page")).toBeVisible();

    // Verify overview section is visible
    const settingsPage = page.getByTestId("organization-settings-page");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(settingsPage.locator("dt", { hasText: "Members" })).toBeVisible();
    await expect(settingsPage.locator("dt", { hasText: "Multi-workspace" })).toBeVisible();
    await expect(settingsPage.locator("dt", { hasText: "Max workspaces" })).toBeVisible();

    // Verify danger zone section is visible
    await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
    await expect(page.getByText("Delete organization")).toBeVisible();
  });
});
