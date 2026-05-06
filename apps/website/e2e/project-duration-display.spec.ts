import { expect, test, type Page } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { selectDropdownOption } from "./fixtures/e2e-select.ts";

const ENTRY_DURATION_SECONDS = 2847; // 47m 27s

async function changePreferenceSelect(page: Page, testId: string, optionLabel: string) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/me/preferences") && response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await selectDropdownOption(page, testId, optionLabel);
  await responsePromise;
}

test.describe("Story: project surfaces use one canonical duration display", () => {
  test("project list and dashboard match the user's duration format for the same project", async ({
    page,
  }) => {
    const email = `project-duration-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Project Duration User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;
    const projectId = await createProjectForWorkspace(page, {
      name: `Duration Project ${Date.now()}`,
      workspaceId,
    });

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 1);
    start.setUTCHours(14, 30, 0, 0);
    const stop = new Date(start.getTime() + ENTRY_DURATION_SECONDS * 1000);

    await createTimeEntryForWorkspace(page, {
      description: "Project duration witness",
      projectId,
      start: start.toISOString(),
      stop: stop.toISOString(),
      workspaceId,
    });

    await page.goto(`/projects/${workspaceId}/list?status=default`);
    await expect(page.getByTestId("projects-page")).toBeVisible();

    const projectRow = page.getByTestId(`project-row-${projectId}`);
    await expect(projectRow).toBeVisible();
    await expect(projectRow).toContainText("0:47:27");

    await page.goto(`/${workspaceId}/projects/${projectId}/dashboard`);
    await expect(page.getByText("Total hours")).toBeVisible();
    await expect(page.getByTestId("project-dashboard-total-hours")).toContainText("0:47:27");

    await page.goto("/profile");
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await changePreferenceSelect(page, "pref-duration-format", "Decimal (0.79 h)");

    await page.goto(`/projects/${workspaceId}/list?status=default`);
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId(`project-row-${projectId}`)).toContainText("0.79 h");

    await page.goto(`/${workspaceId}/projects/${projectId}/dashboard`);
    await expect(page.getByText("Total hours")).toBeVisible();
    await expect(page.getByTestId("project-dashboard-total-hours")).toContainText("0.79 h");
  });
});
