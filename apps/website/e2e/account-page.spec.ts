import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: account settings page", () => {
  test("Given a newly registered account, when the user opens account settings, then all sections are visible", async ({
    page,
  }) => {
    const email = `account-sections-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Account Sections User",
      password,
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("account-page")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Personal Details" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Time Preferences" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Country" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Password Actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account Actions" })).toBeVisible();
  });

  test("Given a registered user, when the user updates their full name, then the change persists after reload", async ({
    page,
  }) => {
    const email = `account-name-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Original Name",
      password,
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();

    const nameInput = page.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    const saveButton = page.getByRole("button", { name: "Save" });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    await expect(page.getByText("Personal details updated")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("account-page")).toBeVisible();
    await expect(nameInput).toHaveValue("Updated Name");
  });

  test("Given a registered user, when the user navigates from user menu, then account settings page opens", async ({
    page,
  }) => {
    const email = `account-nav-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Nav User",
      password,
    });

    // Open user menu and click Account settings
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("account-page")).toBeVisible();
  });

  test("Given a registered user, when password confirmation does not match, then validation errors appear", async ({
    page,
  }) => {
    const email = `account-val-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Validation User",
      password,
    });

    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.getByRole("button", { name: "Change Password" }).click();

    const newPasswordInputs = page.locator('input[autocomplete="new-password"]');

    // Type short password
    await newPasswordInputs.nth(0).fill("abc");
    await expect(page.getByText("Password must be at least 6 characters")).toBeVisible();

    // Type mismatched confirmation
    await newPasswordInputs.nth(0).fill("new-secret-pass");
    await newPasswordInputs.nth(1).fill("different-pass");
    await expect(page.getByText("Passwords do not match")).toBeVisible();

    // Cancel closes the form
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator('input[autocomplete="current-password"]')).not.toBeVisible();
  });

  test("Given a registered user, when the user changes password then logs out, then logging back in with the new password works", async ({
    page,
  }) => {
    const email = `account-pwd-logout-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const newPassword = "new-secret-pass";
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Password Logout User",
      password,
    });

    // Step 1: Change password
    await page.goto(new URL("/account", page.url()).toString());
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.getByRole("button", { name: "Change Password" }).click();

    const currentPasswordInput = page.locator('input[autocomplete="current-password"]');
    const newPasswordInputs = page.locator('input[autocomplete="new-password"]');

    await currentPasswordInput.fill(password);
    await newPasswordInputs.nth(0).fill(newPassword);
    await newPasswordInputs.nth(1).fill(newPassword);

    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();

    // Step 2: Log out via user menu
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await page.waitForURL(/\/(login)?$/);
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    // Verify protected pages redirect to login
    await page.goto(new URL("/timer", page.url()).toString());
    await page.waitForURL(/\/login$/);

    // Step 3: Log back in with new password
    await loginE2eUser(page, test.info(), { email, password: newPassword });
  });
});
