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

    // Navigate to timer page and switch to list view (which has "Last 30 days" shortcut)
    await page.getByRole("link", { name: "Timer" }).click();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    await page.getByRole("radio", { name: "List view" }).click();

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

  test("Timer list view: shortcut label reflects the correct date range", async ({ page }) => {
    const email = `shortcut-range-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Shortcut Range User",
      password,
    });
    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await page.getByRole("link", { name: "Timer" }).click();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    // Switch to list view (defaults to "All dates")
    await page.getByRole("radio", { name: "List view" }).click();

    const pickerButton = page.getByRole("button", { name: /Press Enter to open date picker/ });
    const dialog = page.getByTestId("week-range-dialog");

    // Select "This week" first
    await pickerButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "This week" }).click();
    await expect(pickerButton).toContainText(/This week/);

    // Click "Last 30 days" shortcut
    await pickerButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Last 30 days" }).click();

    // Label should now reflect "Last 30 days", NOT a single week
    await expect(pickerButton).toContainText(/Last 30 days/);

    // Click "This week" shortcut to go back
    await pickerButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "This week" }).click();

    // Label should be back to "This week"
    await expect(pickerButton).toContainText(/This week/);
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
