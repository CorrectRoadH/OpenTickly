import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

const ZIP_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../tests/import/toggl_workspace_6296488_export_cdca337d-1003-4237-8b2f-c9b5c5348b3f.zip",
);

const EXPECTED_PROJECT_COUNT = 73;
const EXPECTED_TAG_COUNT = 18;
const EXPECTED_CLIENT_COUNT = 11;

test.describe("Story: import a real Toggl workspace archive", () => {
  test("Given a registered account, when the user imports a Toggl export ZIP, then the new workspace has all projects, tags, and clients imported correctly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = `import-zip-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const orgName = `Imported Org ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Import Test User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    // Navigate to import page
    await page.goto("/import");
    await expect(
      page.getByRole("heading", { name: /Create a new organization from Toggl export zip/i }),
    ).toBeVisible();

    // Fill org name
    await page.getByPlaceholder("Imported Org").fill(orgName);

    // Upload ZIP file
    const fileInput = page.locator('input[type="file"][accept=".zip,application/zip"]');
    await fileInput.setInputFiles(ZIP_PATH);

    // Intercept the import job response to capture the new workspace id
    let newWorkspaceId = 0;
    const importJobDone = page.waitForResponse(
      (resp) => resp.url().includes("/import/v1/jobs") && resp.request().method() === "POST",
    );

    // Click Upload & import
    await page.getByRole("button", { name: "Upload & import" }).click();

    // Wait for import job response and extract workspace_id
    const importResp = await importJobDone;
    const importJob = await importResp.json();
    expect(importJob.status, `import failed: ${importJob.error_message}`).toBe("completed");
    expect(importJob.workspace_id).toBeGreaterThan(0);
    newWorkspaceId = importJob.workspace_id as number;

    // ── Projects page ─────────────────────────────────────────────────────────
    await page.goto(`/projects/${newWorkspaceId}/list?status=all`);
    await expect(page.getByTestId("projects-page")).toBeVisible();

    // Total count
    await expect(page.getByTestId("projects-summary")).toContainText(
      `Showing ${EXPECTED_PROJECT_COUNT} projects`,
    );

    // Assert CSAPP: name + color — find the row by project-name text content
    const csappName = page.getByTestId("project-name").filter({ hasText: "CSAPP" });
    await expect(csappName).toBeVisible();
    const csappRow = csappName.locator("..").locator("..");
    await expect(csappRow.getByTestId("project-color")).toHaveCSS(
      "background-color",
      hexToRgb("#991102"),
    );

    // Assert a project with a client (Learning how to learn → client 自己)
    const learningName = page
      .getByTestId("project-name")
      .filter({ hasText: "Learning how to learn" });
    await expect(learningName).toBeVisible();
    const learningRow = learningName.locator("..").locator("..");
    await expect(learningRow.getByTestId("project-color")).toHaveCSS(
      "background-color",
      hexToRgb("#2da608"),
    );

    // ── Tags page ─────────────────────────────────────────────────────────────
    await page.goto(`/workspaces/${newWorkspaceId}/tags`);
    await expect(page.getByTestId("tags-page")).toBeVisible();

    // Total count in summary (format: "Showing 18 tags in <workspace name>.")
    await expect(page.getByTestId("tags-summary")).toContainText(`${EXPECTED_TAG_COUNT} tags`);

    // Assert a specific tag: test-tag
    const testTagName = page.getByTestId("tag-name").filter({ hasText: "test-tag" });
    await expect(testTagName).toBeVisible();

    // Assert a Chinese tag: 阅读
    const readingTagName = page.getByTestId("tag-name").filter({ hasText: "阅读" });
    await expect(readingTagName).toBeVisible();

    // Tag color is derived from name — assert it's a non-empty color (not transparent/none)
    const testTagRow = testTagName.locator("..").locator("..");
    const tagColor = await testTagRow
      .getByTestId("tag-color")
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(tagColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(tagColor).not.toBe("transparent");

    // ── Clients count via clients page ────────────────────────────────────────
    await page.goto(`/workspaces/${newWorkspaceId}/clients`);
    await expect(page.getByTestId("clients-page")).toBeVisible();
    // Format: "Showing 11 clients in workspace {id}."
    await expect(page.getByTestId("clients-summary")).toContainText(
      `${EXPECTED_CLIENT_COUNT} clients`,
    );
  });
});

/** Convert #rrggbb to the rgb(r, g, b) string Playwright CSS matcher expects. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
