import { expect, test } from "@playwright/test";

import {
  createProjectForWorkspace,
  createTagForWorkspace,
  createTimeEntryForWorkspace,
  loginE2eUser,
  registerE2eUser,
} from "./fixtures/e2e-auth.ts";
import { pollCurrentRunningEntry } from "./fixtures/e2e-api.ts";

/**
 * Registers a fresh user and logs them in, returning the workspace session.
 */
async function setupUser(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
) {
  const email = `start-link-${testInfo.workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, testInfo, {
    email,
    fullName: "Start Link User",
    password,
  });

  await page.context().clearCookies();
  return loginE2eUser(page, testInfo, { email, password });
}

test.describe("Timer start link", () => {
  test("Navigating to /timer?description=... auto-starts a timer with that description", async ({
    page,
  }) => {
    await setupUser(page, test.info());

    const desc = `start-link-desc-${Date.now()}`;
    await page.goto(`/timer?description=${encodeURIComponent(desc)}`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Timer should be running with the given description
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.description).toBe(desc);
    expect(entry.stop).toBeFalsy();
  });

  test("Navigating to /timer?description=...&billable=true starts a billable timer", async ({
    page,
  }) => {
    await setupUser(page, test.info());

    const desc = `start-link-billable-${Date.now()}`;
    await page.goto(`/timer?description=${encodeURIComponent(desc)}&billable=true`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.description).toBe(desc);
    expect(entry.billable).toBe(true);
  });

  test("Navigating to /timer/start?desc=... uses Toggl-compatible alias", async ({ page }) => {
    await setupUser(page, test.info());

    const desc = `toggl-compat-${Date.now()}`;
    await page.goto(`/timer/start?desc=${encodeURIComponent(desc)}`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.description).toBe(desc);
  });

  test("Start link params are stripped from URL after starting", async ({ page }) => {
    await setupUser(page, test.info());

    const desc = `url-strip-${Date.now()}`;
    await page.goto(`/timer?description=${encodeURIComponent(desc)}&billable=true`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    // URL should no longer contain the start params
    await expect
      .poll(() => {
        const url = new URL(page.url());
        return url.searchParams.has("description") || url.searchParams.has("billable");
      })
      .toBe(false);
  });

  test("Start link from entry copies description, project, and tags", async ({ page }) => {
    const { currentWorkspaceId: workspaceId } = await setupUser(page, test.info());

    // Create a project and tag
    const projectId = await createProjectForWorkspace(page, {
      name: "Start Link Project",
      workspaceId,
    });
    const tagId = await createTagForWorkspace(page, {
      name: "start-link-tag",
      workspaceId,
    });

    // Create a stopped time entry with description, project, and tag
    const desc = `start-link-full-${Date.now()}`;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600_000);
    await createTimeEntryForWorkspace(page, {
      description: desc,
      projectId,
      start: oneHourAgo.toISOString(),
      stop: now.toISOString(),
      tagIds: [tagId],
      workspaceId,
    });

    // Navigate using the start link with all entry details (the format the copy-start-link should produce)
    const params = new URLSearchParams();
    params.set("description", desc);
    params.set("project_id", String(projectId));
    params.set("tag_ids", String(tagId));
    await page.goto(`/timer?${params.toString()}`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.description).toBe(desc);
    expect(entry.project_id ?? entry.pid).toBe(projectId);
    expect(entry.tag_ids).toEqual([tagId]);
  });

  test("Copy start link from editor includes entry details in URL", async ({ page }) => {
    const { currentWorkspaceId: workspaceId } = await setupUser(page, test.info());

    // Create a project and tag
    const projectId = await createProjectForWorkspace(page, {
      name: "CopyLink Project",
      workspaceId,
    });
    const tagId = await createTagForWorkspace(page, {
      name: "copylink-tag",
      workspaceId,
    });

    // Create a stopped time entry
    const desc = `copylink-${Date.now()}`;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600_000);
    await createTimeEntryForWorkspace(page, {
      description: desc,
      projectId,
      start: oneHourAgo.toISOString(),
      stop: now.toISOString(),
      tagIds: [tagId],
      workspaceId,
    });

    // Navigate to timer page and open the entry editor
    await page.goto("/timer");
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Click on the time entry to open editor
    await page.getByRole("button", { name: desc }).first().click();
    await expect(page.getByTestId("time-entry-editor-dialog")).toBeVisible({ timeout: 5_000 });

    // Intercept clipboard write to capture the copied URL
    await page.evaluate(() => {
      (window as any).__clipboardText = "";
      navigator.clipboard.writeText = async (text: string) => {
        (window as any).__clipboardText = text;
      };
    });

    // Click "Entry actions" then "Copy start link"
    await page.getByRole("button", { name: "Entry actions" }).click();
    await page.getByText("Copy start link").click();

    // Read the clipboard value
    const copiedText = await page.evaluate(() => (window as any).__clipboardText as string);

    // Verify the URL contains the entry details
    const url = new URL(copiedText);
    expect(url.searchParams.get("description")).toBe(desc);
    expect(url.searchParams.get("project_id")).toBe(String(projectId));
    expect(url.searchParams.get("tag_ids")).toBe(String(tagId));
  });

  test("Does not auto-start when a timer is already running", async ({ page }) => {
    await setupUser(page, test.info());

    // Start a timer manually first
    await page.goto("/timer");
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByLabel("Time entry description").fill("already-running");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

    // Wait for the server to confirm the running entry before navigating,
    // otherwise page.goto resets React Query cache and the guard may see stale data.
    const { body: runningBefore } = await pollCurrentRunningEntry(page);
    expect(runningBefore).not.toBeNull();
    expect(runningBefore.description).toBe("already-running");

    // Now navigate with start-link params — should NOT replace the running entry
    const desc = `should-not-start-${Date.now()}`;
    await page.goto(`/timer?description=${encodeURIComponent(desc)}`);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // The stop button should still show the original timer (not a new one).
    // Verify via API that the original entry is still the current running entry.
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    const { body: entry } = await pollCurrentRunningEntry(page);
    expect(entry).not.toBeNull();
    expect(entry.description).toBe("already-running");
  });
});
