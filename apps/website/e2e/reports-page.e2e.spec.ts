import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: browse the reports surface", () => {
  test("Given a newly registered account, when the user opens reports, then summary reporting tools and charts are visible", async ({
    page,
  }) => {
    const email = `reports-e2e-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Reports E2E User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    await page.getByRole("link", { name: "Reports" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/reports$`));
    await expect(page.getByTestId("reports-page")).toBeVisible();
    await expect(page.getByTestId("reports-tabs")).toContainText("Summary");
    await expect(page.getByTestId("reports-filter-bar")).toContainText("This week . W12");
    await expect(page.getByRole("button", { name: "Save and share" })).toBeVisible();
    await expect(page.getByTestId("reports-summary-metrics")).toContainText("Total Hours");
    await expect(page.getByTestId("reports-summary-metrics")).toContainText("Average Daily Hours");
    await expect(page.getByTestId("reports-duration-chart")).toBeVisible();
    await expect(page.getByTestId("reports-distribution-panel")).toBeVisible();
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Community");
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Deep work");
  });
});
