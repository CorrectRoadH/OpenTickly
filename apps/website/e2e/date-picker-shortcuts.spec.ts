import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Date picker shortcut active state", () => {
  test("Timer: clicking 'Last 30 days' highlights only that shortcut", async ({ page }) => {
    const email = `shortcut-timer-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Timer User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to timer page
    await page.getByRole("link", { name: "Timer" }).click();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Open the date picker
    await page.getByTestId("week-range-dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: /Press Enter to open date picker/ }).click();
    await expect(page.getByTestId("week-range-dialog")).toBeVisible();

    const dialog = page.getByTestId("week-range-dialog");

    // "This week" should be active by default
    await expect(dialog.getByRole("button", { name: "This week" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Click "Last 30 days"
    await dialog.getByRole("button", { name: "Last 30 days" }).click();

    // Re-open picker
    await page.getByRole("button", { name: /Press Enter to open date picker/ }).click();
    await expect(dialog).toBeVisible();

    // Only "Last 30 days" should be active
    await expect(dialog.getByRole("button", { name: "Last 30 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // All others should NOT be active
    for (const label of ["Today", "Yesterday", "This week", "Last week", "All dates"]) {
      await expect(dialog.getByRole("button", { name: label, exact: true })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  test("Reports: clicking 'This month' highlights only that shortcut", async ({ page }) => {
    const email = `shortcut-reports-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Reports User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to reports page
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByTestId("reports-page")).toBeVisible();

    // Open the date picker
    await page.getByRole("button", { name: /Press Enter to open date picker/ }).click();
    await expect(page.getByTestId("week-range-dialog")).toBeVisible();

    // "This week" should be active by default
    await expect(
      page.getByTestId("week-range-dialog").getByRole("button", { name: "This week" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Click "This month"
    await page.getByTestId("week-range-dialog").getByRole("button", { name: "This month" }).click();

    // Re-open picker
    await page.getByRole("button", { name: /Press Enter to open date picker/ }).click();
    await expect(page.getByTestId("week-range-dialog")).toBeVisible();

    // Only "This month" should be active
    await expect(
      page.getByTestId("week-range-dialog").getByRole("button", { name: "This month" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Others should NOT be active
    for (const label of ["This week", "Last week", "Last month", "This year"]) {
      await expect(
        page.getByTestId("week-range-dialog").getByRole("button", { name: label, exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
    }
  });
});
