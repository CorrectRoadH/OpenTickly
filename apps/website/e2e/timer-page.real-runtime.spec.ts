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

  test("Given the timer page calendar view, when the main shell scrolls, then the timer header stays pinned", async ({
    page,
  }) => {
    const email = `timer-sticky-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Timer Sticky User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    await expect(page).toHaveURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();

    const mainScroll = page.getByTestId("app-shell-main");
    const weekRangeButton = page.getByRole("button", {
      name: /\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}/,
    });

    await expect(weekRangeButton).toBeVisible();

    const before = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    await mainScroll.evaluate((element: HTMLElement) => {
      element.scrollTop = 900;
      element.dispatchEvent(new Event("scroll"));
    });

    await expect
      .poll(async () =>
        mainScroll.evaluate((element: HTMLElement) => ({ scrollTop: element.scrollTop })),
      )
      .toMatchObject({ scrollTop: 900 });

    const after = await weekRangeButton.evaluate((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, windowScrollY: window.scrollY };
    });

    expect(after.windowScrollY).toBe(before.windowScrollY);
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
  });
});
