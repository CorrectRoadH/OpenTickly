import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";

test.describe("Story: manage the running timer", () => {
  test("Given a newly registered account, when the user starts and stops a timer, then the timer controls reflect the running state", async ({
    page,
  }) => {
    const email = `timer-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = loginSession.currentWorkspaceId;

    const now = new Date();
    const baseYear = now.getUTCFullYear();
    const baseMonth = now.getUTCMonth();
    const baseDate = now.getUTCDate();

    for (let entryIndex = 0; entryIndex < 24; entryIndex += 1) {
      const start = new Date(Date.UTC(baseYear, baseMonth, baseDate, entryIndex % 24, 0, 0));
      const stop = new Date(Date.UTC(baseYear, baseMonth, baseDate, entryIndex % 24, 45, 0));
      await createTimeEntryForWorkspace(page, {
        description: `Scrollable entry ${entryIndex + 1}`,
        start: start.toISOString(),
        stop: stop.toISOString(),
        workspaceId,
      });
    }

    await page.goto(new URL("/timer", page.url()).toString());

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-header-overflow-action")).toHaveCount(0);

    await page.getByLabel("Time entry description").fill("Timer real runtime flow");
    await page.getByRole("button", { name: "Start timer" }).click();

    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "stop");
    await expect(page.getByTestId("timer-elapsed")).toHaveText(/\d{2}:\d{2}:\d{2}/);
    await expect(page.getByTestId("timer-elapsed")).not.toContainText("492847");

    await page.getByRole("button", { name: "Stop timer" }).click();

    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByTestId("timer-action-button")).toHaveAttribute("data-icon", "play");
  });

  test("Given the timer page calendar view, when wheel scrolling targets the timer surface, then the timer header stays pinned without shifting the shell scroll", async ({
    page,
  }) => {
    const email = `timer-sticky-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Sticky User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    const mainScroll = page.getByTestId("app-shell-main");
    const scrollArea = page.getByTestId("tracking-timer-scroll-area");
    const weekRangeButton = page.getByRole("button", {
      name: /\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}/,
    });

    await expect(scrollArea).toBeVisible();
    await expect(weekRangeButton).toBeVisible();

    await mainScroll.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await scrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });

    const before = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    const scrollAreaBox = await scrollArea.boundingBox();
    if (!scrollAreaBox) {
      throw new Error("Timer scroll area is not visible.");
    }

    await page.mouse.move(scrollAreaBox.x + scrollAreaBox.width / 2, scrollAreaBox.y + 80);
    await page.mouse.wheel(0, 900);

    await expect
      .poll(async () => ({
        main: await mainScroll.evaluate((element: HTMLElement) => element.scrollTop),
        timer: await scrollArea.evaluate((element: HTMLElement) => element.scrollTop),
      }))
      .toEqual({
        main: 0,
        timer: expect.any(Number),
      });

    const after = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    expect(after.windowScrollY).toBe(before.windowScrollY);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });

  test("Given the timer page calendar view, when the user scrolls the timer content, then the calendar day header stays pinned", async ({
    page,
  }) => {
    const email = `timer-calendar-sticky-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Calendar Sticky User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);

    const mainScroll = page.getByTestId("app-shell-main");
    const scrollArea = page.getByTestId("tracking-timer-scroll-area");
    const calendarScrollArea = page.getByTestId("calendar-grid-scroll-area");
    const dayHeader = page.getByTestId("calendar-day-header-mon");

    await expect(scrollArea).toBeVisible();
    await expect(calendarScrollArea).toBeVisible();
    await expect(dayHeader).toBeVisible();

    await mainScroll.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await scrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });
    await calendarScrollArea.evaluate((element: HTMLElement) => {
      element.scrollTop = 0;
    });

    const before = await dayHeader.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top };
    });

    const scrollAreaBox = await calendarScrollArea.boundingBox();
    if (!scrollAreaBox) {
      throw new Error("Calendar scroll area is not visible.");
    }

    await page.mouse.move(scrollAreaBox.x + scrollAreaBox.width / 2, scrollAreaBox.y + 120);
    await page.mouse.wheel(0, 900);

    await expect
      .poll(async () => ({
        main: await mainScroll.evaluate((element: HTMLElement) => element.scrollTop),
        timer: await scrollArea.evaluate((element: HTMLElement) => element.scrollTop),
        calendar: await calendarScrollArea.evaluate((element: HTMLElement) => element.scrollTop),
      }))
      .toEqual({
        main: 0,
        timer: 0,
        calendar: expect.any(Number),
      });

    const after = await dayHeader.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top };
    });

    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });

  test("Given the user switches to another organization, when they return to timer, then time entries from the previous workspace no longer appear", async ({
    page,
  }) => {
    const email = `timer-multi-workspace-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const firstWorkspaceEntryDescription = `Cross workspace entry ${Date.now()}`;
    const firstWorkspaceProjectName = `Cross workspace project ${Date.now()}`;
    const entryStart = new Date();
    entryStart.setUTCHours(9, 0, 0, 0);
    const entryStop = new Date(entryStart.getTime() + 30 * 60 * 1000);

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Multi Workspace User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const firstWorkspaceId = loginSession.currentWorkspaceId;
    const firstWorkspaceProjectId = await createProjectForWorkspace(page, {
      name: firstWorkspaceProjectName,
      workspaceId: firstWorkspaceId,
    });

    await createTimeEntryForWorkspace(page, {
      description: firstWorkspaceEntryDescription,
      projectId: firstWorkspaceProjectId,
      start: entryStart.toISOString(),
      stop: entryStop.toISOString(),
      workspaceId: firstWorkspaceId,
    });

    const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
    await organizationButton.click();
    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(`Timer Org ${Date.now()}`);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).not.toContainText("Timer Multi Workspace User Organization");

    await page.goto(new URL(`/workspaces/${firstWorkspaceId}/projects`, page.url()).toString());
    await expect(page).toHaveURL(new RegExp(`/projects/${firstWorkspaceId}/list\\?status=all$`));
    await expect(page.getByTestId("projects-page")).toBeVisible();

    await page.goto(new URL("/timer", page.url()).toString());
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    const crossWorkspaceEntry = page.getByRole("button", {
      name: `Edit ${firstWorkspaceEntryDescription}`,
    });
    await expect(crossWorkspaceEntry).toHaveCount(0);
  });
});
