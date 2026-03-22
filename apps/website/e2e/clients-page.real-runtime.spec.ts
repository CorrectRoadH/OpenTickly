import { expect, test } from "@playwright/test";

import { loginRuntimeUser, registerRuntimeUser } from "./fixtures/runtime-auth.ts";

test.describe("Story: browse clients from the workspace shell", () => {
  test("Given a newly registered account, when the user opens clients, then the clients surface renders inside the shell", async ({
    page,
  }) => {
    const email = `clients-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Clients Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Clients" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/clients$`));
    await expect(page.getByTestId("clients-page")).toBeVisible();
    await expect(page.getByTestId("clients-filter-bar")).toBeVisible();
    await expect(page.getByTestId("clients-summary")).toContainText(`workspace ${workspaceId}`);
  });
});
