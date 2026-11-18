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
