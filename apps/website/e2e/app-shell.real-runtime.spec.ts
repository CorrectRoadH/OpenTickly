import { expect, test } from "@playwright/test";

import { loginE2eUser, readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: enter the tracking shell", () => {
  const defaultBadges = (scope: { locator: (selector: string) => any }) =>
    scope.locator("span").filter({ hasText: /^Default$/ });

  test("Given a newly registered account, when the user signs back in, then the time-entry shell loads", async ({
    page,
  }) => {
    const email = `real-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Real Runtime User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page.getByRole("button", { exact: true, name: "Organization" })).toBeVisible();
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("shell-primary-nav")).toContainText("Track");
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible();
  });

  test("Given the shell organization switcher, when the user creates an organization from the dropdown, then the new organization appears and can be selected", async ({
    page,
  }) => {
    const email = `organization-create-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const organizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Create User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();

    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(organizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(organizationName);

    await organizationButton.click();
    await expect(workspaceListbox.getByRole("button", { name: organizationName })).toBeVisible();
  });

  test("Given the shell organization switcher with multiple organizations, when the user selects another organization from the dropdown, then the current organization and session switch to that organization", async ({
    page,
  }) => {
    const email = `organization-switch-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const secondOrganizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Switch User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const initialSession = await readSessionBootstrap(page);
    const initialOrganizationId = initialSession.current_organization_id;
    const initialOrganizationName =
      initialSession.organizations.find((organization) => organization.id === initialOrganizationId)
        ?.name ?? "";

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();
    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(secondOrganizationName);

    await organizationButton.click();
    await page.getByRole("button", { name: new RegExp(initialOrganizationName) }).click();

    await expect(organizationButton).toContainText(initialOrganizationName);
    await expect(page.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      `/workspaces/${initialSession.current_workspace_id}/reports`,
    );

    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_organization_id)
      .toBe(initialOrganizationId);

    const switchedSession = await readSessionBootstrap(page);
    expect(
      switchedSession.organizations.find(
        (organization) => organization.id === switchedSession.current_organization_id,
      )?.name,
    ).toBe(initialOrganizationName);
  });

  test("Given a non-default current organization, when the user hovers it in the switcher, then they can set it as the only default organization", async ({
    page,
  }) => {
    const email = `organization-default-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const secondOrganizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Default User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const initialSession = await readSessionBootstrap(page);
    expect(initialSession.user.default_workspace_id).toBe(initialSession.current_workspace_id);
    const initialOrganizationName =
      initialSession.organizations.find(
        (organization) => organization.id === initialSession.current_organization_id,
      )?.name ?? "";

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    await expect(
      workspaceListbox.locator("li", {
        has: page.getByRole("button", { name: initialOrganizationName }),
      }),
    ).toContainText("Default");
    await expect(
      workspaceListbox.locator("li", {
        has: page.getByRole("button", { name: initialOrganizationName }),
      }),
    ).not.toContainText("Set to default");

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(secondOrganizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(secondOrganizationName);
    await expect
      .poll(async () => (await readSessionBootstrap(page)).current_workspace_id)
      .not.toBe(initialSession.current_workspace_id);

    await organizationButton.click();
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    await expect(
      workspaceListbox.getByRole("button", { name: initialOrganizationName }),
    ).toBeVisible();
    await expect(workspaceListbox.locator('[aria-label="Current organization"]')).toHaveCount(1);

    const currentOrganizationRow = workspaceListbox.locator("li", {
      has: page.getByRole("button", { name: secondOrganizationName }),
    });
    await currentOrganizationRow.hover();
    await currentOrganizationRow
      .getByRole("button", { name: `Set to default ${secondOrganizationName}` })
      .click();

    await expect
      .poll(async () => (await readSessionBootstrap(page)).user.default_workspace_id)
      .not.toBe(initialSession.user.default_workspace_id);

    await page.keyboard.press("Escape");
    await organizationButton.click();
    await expect(workspaceListbox).toBeVisible();
    await expect(defaultBadges(workspaceListbox)).toHaveCount(1);
    const updatedSession = await readSessionBootstrap(page);
    expect(updatedSession.user.default_workspace_id).toBe(updatedSession.current_workspace_id);
  });
});
