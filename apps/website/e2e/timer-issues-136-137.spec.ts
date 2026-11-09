import { expect, test } from "@playwright/test";
import {
  createProjectForWorkspace,
  createTimeEntryForWorkspace,
  registerE2eUser,
  readSessionBootstrap,
} from "./fixtures/e2e-auth.ts";

for (const theme of ["light", "dark"] as const) {
  test(`recent entries start timers and calendar stays readable in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await registerE2eUser(page, test.info(), {
      email: `timer-parity-${theme}-${Date.now()}@example.com`,
      fullName: "Timer Parity",
      password: "secret-pass",
    });
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    const session = await readSessionBootstrap(page);
    const workspaceId = session.current_workspace_id ?? session.workspaces[0]!.id;
    const projectId = await createProjectForWorkspace(page, { workspaceId, name: "Peach Project" });
    const status = await page.evaluate(
      async ({ workspaceId, projectId }) => {
        return (
          await fetch(`/api/v9/workspaces/${workspaceId}/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color: "#f2a483" }),
          })
        ).status;
      },
      { workspaceId, projectId },
    );
    expect(status).toBe(200);
    const start = new Date();
    start.setUTCHours(10, 0, 0, 0);
    const entryId = await createTimeEntryForWorkspace(page, {
      workspaceId,
      projectId,
      description: "Readable recent work",
      start: start.toISOString(),
      stop: new Date(start.getTime() + 3600000).toISOString(),
    });
    await page.reload();
    await expect(page.getByTestId("tracking-timer-page")).toBeVisible();
    const card = page.getByTestId(`calendar-entry-${entryId}`);
    await expect(card.getByText("Readable recent work")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const contrast = await card
      .getByText("Readable recent work", { exact: true })
      .evaluate((label) => {
        let surface = label.parentElement!;
        while (
          getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)" &&
          surface.parentElement
        ) {
          surface = surface.parentElement;
        }
        const background = getComputedStyle(surface).backgroundColor;
        const foreground = getComputedStyle(label).color;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        function luminance(color: string) {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const data = context.getImageData(0, 0, 1, 1).data;
          const channels = [data[0], data[1], data[2]].map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        }
        const a = luminance(foreground),
          b = luminance(background);
        return { foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    expect(contrast.ratio, JSON.stringify(contrast)).toBeGreaterThanOrEqual(4.5);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`calendar-${theme}.png`) });
    await page.getByLabel("Time entry description", { exact: true }).click();
    const suggestions = page.getByTestId("timer-composer-suggestions-dialog");
    await expect(suggestions.getByText("Readable recent work")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`timer-${theme}.png`) });
    await suggestions.getByRole("button", { name: /Readable recent work/ }).click();
    await expect(suggestions).not.toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(async (previousId) => {
          const entry = await (await fetch("/api/v9/me/time_entries/current")).json();
          return {
            description: entry?.description,
            projectId: entry?.project_id ?? entry?.pid,
            isNew: entry?.id !== previousId,
            running: entry?.duration < 0 && !entry?.stop,
          };
        }, entryId),
      )
      .toEqual({ description: "Readable recent work", projectId, isNew: true, running: true });
  });
}
