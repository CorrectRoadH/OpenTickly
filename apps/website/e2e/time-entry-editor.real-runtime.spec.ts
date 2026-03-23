import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: edit a stopped time entry", () => {
  test("Given a stopped time entry, when the user opens the editor dialog, then the header close button is vertically centered and has consistent styling with other header buttons", async ({
    page,
  }) => {
    const email = `edit-entry-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Edit Entry User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const description = "Time entry to edit";
    await page.getByPlaceholder("What are you working on?").fill(description);
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();

    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();

    await expect(page.getByRole("button", { name: `Edit ${description}` })).toBeVisible();
    await page.getByRole("button", { name: `Edit ${description}` }).click();

    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole("button", { name: "Close editor" });
    await expect(closeButton).toBeVisible();

    const closeButtonBox = await closeButton.boundingBox();
    expect(closeButtonBox).not.toBeNull();

    const playButton = dialog.getByRole("button", { name: /continue entry|stop timer/i });
    await expect(playButton).toBeVisible();
    const playButtonBox = await playButton.boundingBox();
    expect(playButtonBox).not.toBeNull();

    if (closeButtonBox && playButtonBox) {
      const closeButtonCenterY = closeButtonBox.y + closeButtonBox.height / 2;
      const playButtonCenterY = playButtonBox.y + playButtonBox.height / 2;
      expect(Math.abs(closeButtonCenterY - playButtonCenterY)).toBeLessThan(3);
    }

    const closeButtonClasses = await closeButton.getAttribute("class");
    expect(closeButtonClasses).toContain("size-7");
    expect(closeButtonClasses).toContain("rounded-full");
  });
});
