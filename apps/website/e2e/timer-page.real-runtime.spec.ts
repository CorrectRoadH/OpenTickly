import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

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
    await loginE2eUser(page, test.info(), { email, password });

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
});
