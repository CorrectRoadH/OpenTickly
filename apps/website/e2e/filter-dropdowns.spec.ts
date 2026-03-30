import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

/**
 * Helpers for creating test data via API.
 */
async function createClientForWorkspace(
  page: import("@playwright/test").Page,
  options: { name: string; workspaceId: number },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/clients`, {
      body: JSON.stringify({ name: request.name }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) throw new Error(`Create client failed with ${response.status}`);
    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

async function createProjectWithClient(
  page: import("@playwright/test").Page,
  options: { clientId: number; name: string; workspaceId: number },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/projects`, {
      body: JSON.stringify({ client_id: request.clientId, name: request.name }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) throw new Error(`Create project failed with ${response.status}`);
    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

test.describe("Story: filter dropdown components work across pages", () => {
  test("Projects page: checkbox filter narrows results by client, radio filter switches billable", async ({
    page,
  }) => {
    const email = `filter-proj-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Filter Projects User",
      password,
    });

    await page.context().clearCookies();
    const { currentWorkspaceId: workspaceId } = await loginE2eUser(page, test.info(), {
      email,
      password,
    });

    // Create two clients and one project per client
    const clientAId = await createClientForWorkspace(page, {
      name: "Client Alpha",
      workspaceId,
    });
    const clientBId = await createClientForWorkspace(page, {
      name: "Client Beta",
      workspaceId,
    });
    await createProjectWithClient(page, {
      clientId: clientAId,
      name: "Alpha Project",
      workspaceId,
    });
    await createProjectWithClient(page, {
      clientId: clientBId,
      name: "Beta Project",
      workspaceId,
    });

    // Navigate to projects
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("projects-filter-bar")).toBeVisible();

    // Both projects visible initially
    await expect(page.getByText("Alpha Project")).toBeVisible();
    await expect(page.getByText("Beta Project")).toBeVisible();

    // Open Client checkbox filter and select "Client Alpha"
    const clientFilter = page.getByTestId("projects-filter-client");
    await clientFilter.click();
    await page.getByRole("checkbox", { name: "Client Alpha" }).check();

    // Only Alpha Project visible
    await expect(page.getByText("Alpha Project")).toBeVisible();
    await expect(page.getByText("Beta Project")).not.toBeVisible();

    // Button shows count
    await expect(clientFilter).toContainText("Client (1)");

    // Clear all
    await page.getByRole("button", { name: "Clear all" }).click();

    // Both projects visible again
    await expect(page.getByText("Alpha Project")).toBeVisible();
    await expect(page.getByText("Beta Project")).toBeVisible();

    // Close the dropdown by clicking elsewhere
    await page.getByTestId("projects-filter-bar").click({ position: { x: 5, y: 5 } });

    // Test RadioFilterDropdown — Billable filter
    const billableFilter = page.getByTestId("projects-filter-billable");
    await expect(billableFilter).toContainText("Billable");
    await billableFilter.click();

    // Select "Non-billable" option (avoids name collision with the trigger button)
    await page.getByRole("button", { name: "Non-billable" }).click();

    // Filter label should show active state
    await expect(billableFilter).toContainText("Non-billable ✓");
  });

  test("Reports page: checkbox filter narrows breakdown by project", async ({ page }) => {
    const email = `filter-rpt-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Filter Reports User",
      password,
    });

    await page.context().clearCookies();
    const { currentWorkspaceId: workspaceId } = await loginE2eUser(page, test.info(), {
      email,
      password,
    });

    // Create two projects with time entries
    const projAId = await createProjectForWorkspace(page, {
      name: "Rpt Project A",
      workspaceId,
    });
    const projBId = await createProjectForWorkspace(page, {
      name: "Rpt Project B",
      workspaceId,
    });

    const start = new Date();
    start.setUTCHours(9, 0, 0, 0);
    const midStop = new Date(start);
    midStop.setUTCHours(10, 0, 0, 0);
    const endStop = new Date(start);
    endStop.setUTCHours(11, 0, 0, 0);

    await createTimeEntryForWorkspace(page, {
      description: "Entry A",
      projectId: projAId,
      start: start.toISOString(),
      stop: midStop.toISOString(),
      workspaceId,
    });
    await createTimeEntryForWorkspace(page, {
      description: "Entry B",
      projectId: projBId,
      start: midStop.toISOString(),
      stop: endStop.toISOString(),
      workspaceId,
    });

    // Navigate to reports
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByTestId("reports-page")).toBeVisible();
    await expect(page.getByTestId("reports-filter-bar")).toBeVisible();

    // Both projects in breakdown
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Rpt Project A");
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Rpt Project B");

    // Open Project checkbox filter and select "Rpt Project A"
    const projectFilter = page.getByTestId("reports-filter-project");
    await projectFilter.click();
    await page.getByRole("checkbox", { name: "Rpt Project A" }).check();

    // Only Project A in breakdown
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Rpt Project A");
    await expect(page.getByTestId("reports-breakdown-table")).not.toContainText("Rpt Project B");

    // Button shows count
    await expect(projectFilter).toContainText("Project (1)");

    // Clear and verify both return
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Rpt Project A");
    await expect(page.getByTestId("reports-breakdown-table")).toContainText("Rpt Project B");
  });
});
