import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";
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

  test("Does not auto-start when a timer is already running", async ({ page }) => {
    await setupUser(page, test.info());

    // Start a timer manually first
    await page.goto("/timer");
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByLabel("Time entry description").fill("already-running");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible({ timeout: 10_000 });

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
