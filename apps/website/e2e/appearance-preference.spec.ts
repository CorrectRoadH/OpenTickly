import { expect, test } from "@playwright/test";
import { registerE2eUser } from "./fixtures/e2e-auth.ts";

test("light appearance persists and system appearance follows the OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await registerE2eUser(page, test.info(), {
    email: `appearance-${Date.now()}@example.com`,
    fullName: "Appearance Test",
    password: "secret-pass",
  });
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: test.info().outputPath("light-theme.png"), fullPage: false });
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
