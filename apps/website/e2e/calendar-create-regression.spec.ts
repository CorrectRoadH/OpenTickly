import { expect, test } from "@playwright/test";
import { registerE2eUser } from "./fixtures/e2e-auth.ts";

for (const language of ["en", "fr"] as const) {
  test(`calendar ${language}: creates entries after a minute tick and keeps controls inside the dialog`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-06T10:00:30Z") });
    await registerE2eUser(page, test.info(), {
      email: `calendar-create-${language}-${Date.now()}@example.com`,
      fullName: "Calendar Create",
      password: "secret-pass",
    });
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    if (language === "fr") {
      const status = await page.evaluate(async () => {
        const response = await fetch("/api/v9/me/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language_code: "fr" }),
        });
        return response.status;
      });
      expect(status).toBe(200);
      await page.reload();
      await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    }
    const calendar = page.getByTestId("timer-calendar-view");
    await expect(calendar).toBeVisible();
    await page.clock.fastForward(40_000);
    const slot = page.locator(".rbc-day-slot").nth(1).locator(".rbc-time-slot").nth(40);
    await slot.scrollIntoViewIfNeeded();
    const slotBox = await slot.boundingBox();
    expect(slotBox).not.toBeNull();
    const x = slotBox!.x + slotBox!.width / 2;
    const y = slotBox!.y + slotBox!.height / 2;
    if (language === "fr") {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + slotBox!.height * 2, { steps: 8 });
      await page.mouse.up();
    } else {
      await page.mouse.click(x, y);
    }
    const dialog = page.getByTestId("time-entry-editor-dialog");
    await expect(dialog).toBeVisible();
    const add = dialog.getByRole("button", {
      name: language === "fr" ? "Ajouter une entrée de temps" : "Add time entry",
      exact: true,
    });
    await expect(add).toBeVisible();
    const bounds = await dialog.boundingBox();
    const button = await add.boundingBox();
    expect(bounds).not.toBeNull();
    expect(button).not.toBeNull();
    expect(button!.x + button!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    expect(button!.y + button!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.getByLabel("Time entry description").fill("Created from calendar");
    await page.screenshot({ path: test.info().outputPath("calendar-create.png"), fullPage: false });
    await add.click();
    await expect(dialog).not.toBeVisible();
    await expect(calendar.getByText("Created from calendar").first()).toBeVisible();
  });
}
