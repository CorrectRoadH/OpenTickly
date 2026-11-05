import { expect, test, type Page } from "@playwright/test";
import { readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.beforeEach(async ({ page }, testInfo) => {
  await registerE2eUser(page, testInfo, {
    email: `continuous-${Date.now()}-${testInfo.workerIndex}@example.com`,
    fullName: "Continuous Owner",
    password: "continuous-test-pass",
  });
});

async function holdFirstWrite(page: Page, url: string, method: string) {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const captured = new Promise<void>((resolve) => {
    started = resolve;
  });
  let writes = 0;
  await page.route(url, async (route) => {
    if (route.request().method() === method && ++writes === 1) {
      started();
      await gate;
    }
    await route.continue();
  });
  return { release, captured };
}

test("workspace autosave retains new input while the earlier save completes", async ({
  page,
}, testInfo) => {
  const session = await readSessionBootstrap(page);
  const id = session.current_workspace_id!;
  await page.goto(`/${id}/settings/general`);
  await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
  const name = page.getByRole("textbox", { name: "Workspace Name", exact: true });
  const held = await holdFirstWrite(page, `**/workspaces/${id}/settings`, "PATCH");
  await name.fill("First workspace name");
  await held.captured;
  await name.fill("Latest workspace name");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/workspaces/${id}/settings`) &&
      response.request().postDataJSON().workspace.name === "Latest workspace name",
  );
  held.release();
  expect((await saved).ok()).toBeTruthy();
  await expect(name).toHaveValue("Latest workspace name");
  await page.reload();
  await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
  await expect(name).toHaveValue("Latest workspace name");
  await page.screenshot({ path: testInfo.outputPath("workspace-latest.png") });
});

test("profile autosave persists both changes made across an in-flight request", async ({
  page,
}, testInfo) => {
  await page.goto("/profile");
  await expect(page.getByTestId("profile-page")).toBeVisible();
  const held = await holdFirstWrite(page, "**/me/preferences", "POST");
  await page.getByTestId("pref-date-format").click();
  await page.getByRole("option", { name: "DD.MM.YYYY", exact: true }).click();
  await held.captured;
  await page.getByTestId("pref-time-format").click();
  await page.getByRole("option", { name: "12-hour", exact: false }).click();
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/me/preferences") &&
      response.request().postDataJSON().timeofday_format === "h:mm A",
  );
  held.release();
  expect((await saved).ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId("profile-page")).toBeVisible();
  await expect(page.getByTestId("pref-date-format")).toContainText("DD.MM.YYYY");
  await expect(page.getByTestId("pref-time-format")).toContainText("12-hour");
  await page.getByTestId("pref-date-format").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("profile-latest.png") });
});

for (const kind of ["clients", "tags"] as const) {
  test(`${kind}: a second rename survives the earlier save and reload`, async ({ page }) => {
    const session = await readSessionBootstrap(page);
    const workspaceId = session.current_workspace_id!;
    const created = await page.request.post(`/api/v9/workspaces/${workspaceId}/${kind}`, {
      data: { name: "Original" },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = await created.json();
    await page.goto(`/workspaces/${workspaceId}/${kind}`);
    await expect(page.getByTestId(`${kind}-page`)).toBeVisible();
    await expect(page.getByText("Original", { exact: true })).toBeVisible();
    const singular = kind === "clients" ? "client" : "tag";
    const held = await holdFirstWrite(page, `**/workspaces/${workspaceId}/${kind}/${id}`, "PUT");
    async function rename(value: string) {
      await page.getByRole("button", { name: "Actions for Original", exact: true }).click();
      await page.getByTestId(`${singular}-rename-${id}`).click();
      const input = page.getByTestId(`${singular}-rename-input-${id}`);
      await input.fill(value);
      return input;
    }
    await (await rename("First")).press("Enter");
    await held.captured;
    const input = await rename("Latest");
    const firstSaved = page.waitForResponse(
      (r) => r.request().method() === "PUT" && r.url().endsWith(`/${kind}/${id}`),
    );
    held.release();
    expect((await firstSaved).ok()).toBeTruthy();
    await expect(page.getByText("First", { exact: true })).toBeVisible();
    await expect(input).toHaveValue("Latest");
    await input.press("Enter");
    await expect(page.getByText("Latest", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId(`${kind}-page`)).toBeVisible();
    await expect(page.getByText("Latest", { exact: true })).toBeVisible();
  });
}

test("client bulk delete retains the failed item and retries only it", async ({
  page,
}, testInfo) => {
  const session = await readSessionBootstrap(page);
  const workspaceId = session.current_workspace_id!;
  const ids: number[] = [];
  for (const name of ["First client", "Retry client"]) {
    const created = await page.request.post(`/api/v9/workspaces/${workspaceId}/clients`, {
      data: { name },
    });
    expect(created.ok()).toBeTruthy();
    ids.push((await created.json()).id);
  }
  let attempts = 0;
  await page.route(`**/workspaces/${workspaceId}/clients/${ids[1]}`, async (route) => {
    if (route.request().method() === "DELETE" && ++attempts === 1) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Cannot delete yet" }),
      });
    } else await route.continue();
  });
  await page.goto(`/workspaces/${workspaceId}/clients`);
  await expect(page.getByTestId("clients-page")).toBeVisible();
  await expect(page.getByText("Retry client", { exact: true })).toBeVisible();
  await page.getByRole("checkbox").first().check();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("First client", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Retry client", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeEnabled();
  await expect(page.getByText("Client deleted", { exact: true })).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("bulk-retry.png") });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Client deleted", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  await page.reload();
  await expect(page.getByTestId("clients-page")).toBeVisible();
  await expect(page.getByText("Retry client", { exact: true })).not.toBeVisible();
  const remaining = await page.request.get(`/api/v9/workspaces/${workspaceId}/clients`);
  expect(await remaining.json()).toEqual([]);
});
