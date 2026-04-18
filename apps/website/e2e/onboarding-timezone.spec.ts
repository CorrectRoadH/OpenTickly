import { expect, test } from "@playwright/test";

import { readSessionBootstrap } from "./fixtures/e2e-auth.ts";

// The onboarding dialog should surface the browser-detected timezone so the
// user can confirm or change it inline — without adding an extra step.
test.use({ timezoneId: "Asia/Shanghai" });

test.describe("Story: onboarding confirms the detected timezone", () => {
  test("Given a new registration with Asia/Shanghai browser tz, when the user opens onboarding, then the detected tz is shown; Change reveals the picker; picking Europe/London persists through completion", async ({
    page,
  }) => {
    const email = `onb-tz-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Onb Tz User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();

    await page.waitForURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    const dialog = page.getByTestId("onboarding-dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Detected tz row is visible and shows the browser's zone.
    const detectedRow = dialog.getByTestId("onboarding-detected-timezone");
    await expect(detectedRow).toContainText("Asia/Shanghai");
    await expect(detectedRow).toContainText("UTC+08:00");

    // Reveal the picker and switch to Europe/London.
    await dialog.getByRole("button", { name: "Change" }).click();
    await dialog.getByTestId("timezone-select").click();
    await page.getByTestId("timezone-search").fill("London");
    await page.getByRole("option", { name: "Europe/London" }).click();

    // Row now reflects the new choice.
    await expect(detectedRow).toContainText("Europe/London");

    // Complete onboarding.
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog.getByText("Works with your AI tools")).toBeVisible();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog.getByText("You're all set!")).toBeVisible();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog.getByText("Import your Toggl data")).toBeVisible();
    await dialog.getByRole("button", { name: "Start tracking" }).click();
    await expect(dialog).not.toBeVisible();

    // Backend reflects the picked tz, not the detected one.
    await expect
      .poll(async () => (await readSessionBootstrap(page)).user.timezone)
      .toBe("Europe/London");
  });

  test("Given a new user who does not touch the tz row, when they complete onboarding, then the detected tz is what gets stored", async ({
    page,
  }) => {
    const email = `onb-tz-keep-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Onb Tz Keep User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();

    await page.waitForURL(/\/timer(?:\?.*)?$/);
    const dialog = page.getByTestId("onboarding-dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Skip straight through all four steps.
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: "Start tracking" }).click();
    await expect(dialog).not.toBeVisible();

    const bootstrap = await readSessionBootstrap(page);
    expect(bootstrap.user.timezone).toBe("Asia/Shanghai");
  });
});
