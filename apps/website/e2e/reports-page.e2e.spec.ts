import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { expectedDuration } from "./fixtures/e2e-format.ts";

test.describe("Story: browse the reports surface", () => {
  test("Given a newly registered account, when the user opens reports, then live workspace time data is visible", async ({
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
    const projectId = await createProjectForWorkspace(page, {
      name: "Reports E2E Project",
      workspaceId,
    });
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 1);
    start.setUTCHours(9, 0, 0, 0);
    const stop = new Date(start);
    stop.setUTCHours(11, 30, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Reports E2E Entry",
      projectId,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });

    await page.getByRole("link", { name: "Reports" }).click();

    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/reports(/summary)?$`));
    await expect(page.getByTestId("reports-page")).toBeVisible();
    await expect(page.getByTestId("reports-tabs")).toContainText("Summary");
    await expect(page.getByTestId("reports-filter-bar")).toContainText("This week . W");
    await expect(page.getByRole("button", { name: "Save and share" })).toBeVisible();
    await expect(page.getByTestId("reports-summary-metrics")).toContainText(expectedDuration(9000));
    await expect(page.getByTestId("reports-summary-metrics")).toContainText("2.50 Hours");
    await expect(page.getByTestId("reports-duration-chart")).toBeVisible();
    await expect(page.getByTestId("reports-distribution-panel")).toBeVisible();
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Reports E2E Project");
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("100.00%");
  });
});
