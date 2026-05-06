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
  test("project dashboard includes entries older than 90 days in the project total and table", async ({
    page,
  }) => {
    const email = `project-dashboard-history-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Project Dashboard History User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;
    const projectId = await createProjectForWorkspace(page, {
      name: `History Project ${Date.now()}`,
      workspaceId,
    });

    const olderStart = new Date();
    olderStart.setUTCDate(olderStart.getUTCDate() - 120);
    olderStart.setUTCHours(9, 0, 0, 0);
    const olderStop = new Date(olderStart.getTime() + 60 * 60 * 1000);

    const recentStart = new Date();
    recentStart.setUTCDate(recentStart.getUTCDate() - 1);
    recentStart.setUTCHours(14, 30, 0, 0);
    const recentStop = new Date(recentStart.getTime() + ENTRY_DURATION_SECONDS * 1000);

    await createTimeEntryForWorkspace(page, {
      description: "Old project work",
      projectId,
      start: olderStart.toISOString(),
      stop: olderStop.toISOString(),
      workspaceId,
    });
    await createTimeEntryForWorkspace(page, {
      description: "Recent project work",
      projectId,
      start: recentStart.toISOString(),
      stop: recentStop.toISOString(),
      workspaceId,
    });

    await page.goto(`/${workspaceId}/projects/${projectId}/dashboard`);
    await expect(page.getByText("Total hours")).toBeVisible();
    await expect(page.getByTestId("project-dashboard-total-hours")).toContainText("1:47:27");
    await expect(page.getByText("Old project work")).toBeVisible();
    await expect(page.getByText("Recent project work")).toBeVisible();
  });

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
