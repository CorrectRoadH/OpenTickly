import { expect, test } from "@playwright/test";

import { loginE2eUser, readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

for (const keepOrganization of [false, true]) {
  test(`deleting the active organization restores session (remaining=${keepOrganization})`, async ({
    page,
  }) => {
    const email = `delete-session-${keepOrganization}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), { email, password, fullName: "Delete Session" });
    const initial = await readSessionBootstrap(page);
    const organizationId = initial.current_organization_id!;
    const organizationName = initial.organizations.find((org) => org.id === organizationId)!.name!;
    const retainedName = `Retained ${Date.now()}`;
    if (keepOrganization) {
      const created = await page.evaluate(async (name) => {
        const response = await fetch("/api/v9/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, workspace_name: `${name} Workspace` }),
        });
        return response.ok;
      }, retainedName);
      expect(created).toBe(true);
      await page.reload();
      await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
      await page.getByRole("button", { exact: true, name: "Organization" }).click();
      await expect(page.getByText(retainedName, { exact: true })).toBeVisible();
      await page
        .getByTestId("workspace-switcher-panel")
        .getByText(organizationName, { exact: true })
        .click();
      await expect(page.getByRole("button", { exact: true, name: "Organization" })).toContainText(
        organizationName,
      );
      await expect
        .poll(async () => (await readSessionBootstrap(page)).current_organization_id)
        .toBe(organizationId);
    }
    await page.goto(`/organizations/${organizationId}/settings/danger`);
    await expect(page.getByTestId("organization-settings-page")).toBeVisible();
    await page.getByPlaceholder(organizationName).fill(organizationName);
    const deletion = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/web/v1/organizations/${organizationId}`) &&
        response.request().method() === "DELETE",
    );
    await page.getByRole("button", { name: "Delete this organization" }).click();
    expect((await deletion).status()).toBe(204);
    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    const recovered = await readSessionBootstrap(page);
    expect(recovered.current_organization_id).not.toBe(organizationId);
    expect(recovered.organizations).toHaveLength(1);
    expect(recovered.user.default_workspace_id).toBe(recovered.current_workspace_id);
    if (keepOrganization) expect(recovered.organizations[0].name).toBe(retainedName);
    await page.screenshot({ path: test.info().outputPath("after-deletion.png"), fullPage: true });
    await page.context().clearCookies();
    const loggedIn = await loginE2eUser(page, test.info(), { email, password });
    expect(loggedIn.currentWorkspaceId).toBe(recovered.current_workspace_id);
    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    expect((await readSessionBootstrap(page)).current_workspace_id).toBe(
      recovered.current_workspace_id,
    );
  });
}
