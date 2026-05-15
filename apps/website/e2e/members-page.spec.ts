import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: manage workspace members", () => {
  test("Given an admin opens their own member row, then disabling themselves is not offered", async ({
    page,
  }) => {
    const email = `members-self-disable-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Members Self Admin",
      password,
    });

    await page.context().clearCookies();
    const { currentWorkspaceId } = await loginE2eUser(page, test.info(), { email, password });

    await page.goto(`/workspaces/${currentWorkspaceId}/members`);
    await expect(page.getByTestId("members-page")).toBeVisible();

    const selfMemberId = await page.evaluate(
      async ({ workspaceId, selfEmail }) => {
        const response = await fetch(`/web/v1/workspaces/${workspaceId}/members`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Members request failed with ${response.status}`);
        }
        const payload = (await response.json()) as {
          members: Array<{ email: string; id: number }>;
        };
        const self = payload.members.find((member) => member.email === selfEmail);
        if (!self) throw new Error("Self member row missing");
        return self.id;
      },
      { workspaceId: currentWorkspaceId, selfEmail: email },
    );

    await page.getByTestId(`member-actions-${selfMemberId}`).click();
    await expect(page.getByTestId(`member-actions-menu-${selfMemberId}`)).toBeVisible();
    await expect(page.getByTestId(`member-disable-${selfMemberId}`)).toHaveCount(0);
  });
});
