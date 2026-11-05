import { expect, test } from "@playwright/test";
import { readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

test("an open team dialog supports repeated membership changes and persists after reload", async ({
  page,
}, testInfo) => {
  await registerE2eUser(page, testInfo, {
    email: `team-owner-${Date.now()}@example.com`,
    fullName: "Team Owner",
    password: "test-team-password",
  });
  const session = await readSessionBootstrap(page);
  const organizationId = session.current_organization_id!;
  await page.goto(`/organizations/${organizationId}/settings/groups`);
  await expect(page.getByTestId("organization-settings-page")).toBeVisible();
  await page.getByLabel("Team name").fill("Engineering");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText("Team created")).toBeVisible();
  await page.getByRole("button", { name: "Actions for Engineering" }).click();
  await page.getByRole("button", { name: "Manage members", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const row = (name: string) =>
    dialog.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) });
  const groupsPath = `/api/v9/organizations/${organizationId}/groups`;
  for (let cycle = 0; cycle < 2; cycle++) {
    await row("Team Owner").getByRole("button", { name: "Add member", exact: true }).click();
    await expect(
      row("Team Owner").getByRole("button", { name: "Remove", exact: true }),
    ).toBeEnabled();
    expect((await (await page.request.get(groupsPath)).json())[0].users).toHaveLength(1);
    if (cycle === 0) await page.screenshot({ path: testInfo.outputPath("team-members-added.png") });
    await row("Team Owner").getByRole("button", { name: "Remove", exact: true }).click();
    await expect(
      row("Team Owner").getByRole("button", { name: "Add member", exact: true }),
    ).toBeEnabled();
    expect((await (await page.request.get(groupsPath)).json())[0].users ?? []).toHaveLength(0);
  }
  await page.reload();
  await expect(page.getByTestId("organization-settings-page")).toBeVisible();
  await page.getByRole("button", { name: "Actions for Engineering" }).click();
  await page.getByRole("button", { name: "Manage members", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
  await expect(
    row("Team Owner").getByRole("button", { name: "Add member", exact: true }),
  ).toBeEnabled();
});
