import { expect, test } from "@playwright/test";
import {
  createProjectForWorkspace,
  readSessionBootstrap,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

test("reports show a project rate in the workspace currency without a workspace rate", async ({
  page,
}, testInfo) => {
  await registerE2eUser(page, testInfo, {
    email: `project-rate-${Date.now()}@example.com`,
    fullName: "Rates Owner",
    password: "rates-e2e-pass",
  });
  const { current_workspace_id: workspaceId } = await readSessionBootstrap(page);
  if (!workspaceId) throw new Error("Expected a workspace");
  const projectId = await createProjectForWorkspace(page, { name: "Rated project", workspaceId });
  const workspace = `/api/v9/workspaces/${workspaceId}`;
  const project = `${workspace}/projects/${projectId}`;
  const date = new Date().toISOString().slice(0, 10);

  const settings = await page.request.put(workspace, {
    data: { default_currency: "EUR", default_hourly_rate: 0 },
  });
  expect(settings.ok()).toBeTruthy();
  const updated = await page.request.put(project, {
    data: { billable: true, rate: 10000, currency: "EUR" },
  });
  expect(updated.ok()).toBeTruthy();
  expect(await updated.json()).toMatchObject({ rate: 10000, currency: "EUR" });

  const entry = await page.request.post(`${workspace}/time_entries`, {
    data: {
      billable: true,
      description: "Rated hour",
      duration: 3600,
      project_id: projectId,
      start: `${date}T10:00:00Z`,
      stop: `${date}T11:00:00Z`,
    },
  });
  expect(entry.ok()).toBeTruthy();

  await page.goto(`/workspaces/${workspaceId}/reports/summary`);
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("reports-summary-metrics")).toContainText("€100.00");
  await page.getByRole("link", { name: "Profitability", exact: true }).click();
  await expect(page.getByTestId("reports-profitability-metrics")).toContainText("€100.00");
  await page.screenshot({ path: testInfo.outputPath("project-rate-in-eur.png"), fullPage: true });
});

test("workspace billing settings persist currency and can disable the default rate", async ({
  page,
}, testInfo) => {
  await registerE2eUser(page, testInfo, {
    email: `workspace-rate-${Date.now()}@example.com`,
    fullName: "Billing Owner",
    password: "rates-e2e-pass",
  });
  const { current_workspace_id: workspaceId } = await readSessionBootstrap(page);
  if (!workspaceId) throw new Error("Expected a workspace");

  await page.goto(`/${workspaceId}/settings/billable-rates`);
  await expect(page.getByTestId("billable-rates-section")).toBeVisible();
  const billable = page.getByRole("radio", { name: "Billable", exact: true });
  const nonBillable = page.getByRole("radio", { name: "Non-billable", exact: true });
  const hourlyRate = page.getByRole("textbox", { name: "Hourly Rate" });
  const currency = page.locator("#currency-select");
  const save = async () => {
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.url().endsWith(`/api/v9/workspaces/${workspaceId}`),
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
  };

  await expect(nonBillable).toBeChecked();
  await billable.check();
  await hourlyRate.fill("42.50");
  await currency.click();
  await page.getByRole("option", { name: "EUR", exact: true }).click();
  await save();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("billable-rates-section")).toBeVisible();
  await expect(billable).toBeChecked();
  await expect(hourlyRate).toHaveValue("42.50");
  await expect(currency).toContainText("EUR");
  await page.screenshot({ path: testInfo.outputPath("workspace-billing-eur.png") });

  await nonBillable.check();
  await save();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("billable-rates-section")).toBeVisible();
  await expect(nonBillable).toBeChecked();
  const workspace = await page.request.get(`/api/v9/workspaces/${workspaceId}`);
  expect(workspace.ok()).toBeTruthy();
  expect(await workspace.json()).toMatchObject({ default_currency: "EUR", default_hourly_rate: 0 });
});
