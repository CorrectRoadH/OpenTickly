import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: calendar event card shows project without client", () => {
  test("Given a project without client, when a time entry is created with that project, then the calendar event card shows the project name (without client)", async ({
    page,
  }) => {
    const email = `calendar-no-client-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar No Client User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const projectName = `Test Project No Client ${Date.now()}`;

    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByTestId("projects-page")).toBeVisible();

    await page.getByTestId("projects-create-button").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Project name").fill(projectName);

    await dialog.getByRole("button", { name: "Create project" }).click();

    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(projectName)).toBeVisible();

    await page.getByRole("link", { name: "Timer" }).click();

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    const description = `Time entry with project ${projectName}`;
    await page.getByPlaceholder("What are you working on?").fill(description);

    await page.getByRole("button", { name: "No project" }).click();

    const suggestionsDialog = page.getByRole("dialog");
    await expect(suggestionsDialog).toBeVisible();

    await suggestionsDialog.getByText(projectName).click();

    await expect(suggestionsDialog).not.toBeVisible();

    await page.getByRole("button", { name: "Start timer" }).click();

    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Stop timer" }).click();

    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();

    const editButton = page.getByRole("button", { name: new RegExp(`Edit ${description}`) });
    await expect(editButton).toBeVisible();

    const entryContent = await editButton.textContent();
    expect(entryContent).toContain(description);
    expect(entryContent).toContain(projectName);
    expect(entryContent).not.toContain("•");
  });
});
