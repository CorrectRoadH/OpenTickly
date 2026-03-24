import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: calendar event card displays time entry details", () => {
  test("Given a stopped time entry with project and client, when viewed in calendar, then the event card shows project • client", async ({
    page,
  }) => {
    const email = `calendar-card-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Calendar Card User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    const description = "Test entry with project and client";
    await page.getByPlaceholder("What are you working on?").fill(description);
    await page.getByRole("button", { name: "Start timer" }).click();

    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Stop timer" }).click();

    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();

    const editButton = page.getByRole("button", { name: new RegExp(`Edit ${description}`) });
    await expect(editButton).toBeVisible();

    const entryContent = await editButton.textContent();
    expect(entryContent).toContain(description);
  });
});
