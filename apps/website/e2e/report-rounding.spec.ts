import { expect, test } from "@playwright/test";
import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test("workspace rounding drives reports, exports and invoice quantities", async ({ page }) => {
  const credentials = { email: `rounding-${Date.now()}@example.com`, password: "secret-pass" };
  await registerE2eUser(page, test.info(), { ...credentials, fullName: "Rounding Test" });
  await page.context().clearCookies();
  const { currentWorkspaceId: workspaceId } = await loginE2eUser(page, test.info(), credentials);
  const today = new Date().toISOString().slice(0, 10);
  await createTimeEntryForWorkspace(page, {
    workspaceId,
    description: "Rounding sample",
    start: `${today}T10:00:00Z`,
    stop: `${today}T10:07:00Z`,
  });
  await page.goto(`/${workspaceId}/settings/general`);
  await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
  await page.getByLabel("Rounding direction").selectOption("-1");
  const saved = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes(`/workspaces/${workspaceId}`),
  );
  await page.getByLabel("Rounding interval").selectOption("5");
  await saved;
  await page.reload();
  await expect(page.getByTestId("workspace-settings-page")).toBeVisible();
  await expect(page.getByLabel("Rounding direction")).toHaveValue("-1");
  await expect(page.getByLabel("Rounding interval")).toHaveValue("5");
  await page.goto(`/workspaces/${workspaceId}/reports/summary`);
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("reports-summary-metrics")).toContainText("0:07:00");
  await page.getByTestId("reports-rounding-toggle").click();
  await expect(page.getByTestId("reports-summary-metrics")).toContainText("0:05:00");
  await page.screenshot({ path: test.info().outputPath("rounded-report.png"), fullPage: true });
  const download = page.waitForEvent("download");
  await page.getByTestId("reports-export").click();
  const exported = await download;
  const stream = await exported.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain("0:05:00");
  await page.getByRole("link", { name: "Detailed", exact: true }).click();
  await expect(page.getByTestId("reports-detailed-table")).toContainText("0:05:00");
  await page.getByTestId("reports-rounding-toggle").click();
  await expect(page.getByTestId("reports-detailed-table")).toContainText("0:07:00");
  await page.getByTestId("reports-rounding-toggle").click();
  await expect(page.getByTestId("reports-detailed-table")).toContainText("0:05:00");
  await page.getByRole("link", { name: "Workload", exact: true }).click();
  await expect(page.getByTestId("reports-workload-panel")).toBeVisible();
  await expect(page.getByTestId("reports-summary-metrics")).toContainText("0:05:00");
  await page.getByRole("link", { name: "Summary", exact: true }).click();
  await expect(page.getByTestId("reports-summary-metrics")).toContainText("0:05:00");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByTestId("invoice-editor-page")).toBeVisible();
  await expect(page).toHaveURL(/projects=.*0.08/);
});
