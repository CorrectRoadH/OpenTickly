import { expect, test } from "@playwright/test";

import { loginRuntimeUser, registerRuntimeUser } from "./fixtures/runtime-auth.ts";

test.describe("Story: enter the tracking shell", () => {
  test("Given a newly registered account, when the user signs back in, then the time-entry shell loads", async ({
    page,
  }) => {
    const email = `real-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerRuntimeUser(page, test.info(), {
      email,
      fullName: "Real Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginRuntimeUser(page, test.info(), { email, password });

    await expect(page.getByLabel("Workspace")).toHaveValue(String(loginSession.currentWorkspaceId));
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("shell-primary-nav")).toContainText("Track");
    await expect(page.getByTestId("current-timer-card")).toBeVisible();
  });
});
