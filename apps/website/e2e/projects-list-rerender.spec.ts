import { expect, test } from "@playwright/test";

import { createProjectForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Re-render regression: opening the "New project" dialog — and typing
 * inside it — must never re-render the surrounding project list rows.
 *
 * Each project row renders `useRenderCount()` into a dev-only badge
 * `<span data-testid="directory-table-rendercount-<projectId>">renders: N</span>`
 * (see `DirectoryTableRenderCountBadge` placed inside the name cell in
 * `ProjectsPage`). This test captures each row's render count before any
 * interaction, clicks the top-right create button, types into the
 * editor's name field, and asserts every row's count is unchanged.
 *
 * If `ProjectsPage` regresses to holding dialog state (editor open/close,
 * form fields) such that the page itself re-renders and cascades into the
 * DirectoryTable, this test goes red — exactly the regression the
 * "Rerender Hygiene" section of CLAUDE.md exists to prevent.
 */
test.describe("Projects list re-render hygiene", () => {
  test("opening the create-project dialog does not re-render project list rows", async ({
    page,
  }) => {
    const email = `projects-rerender-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Projects Rerender User",
      password,
    });

    await page.context().clearCookies();
    const session = await loginE2eUser(page, test.info(), { email, password });
    const workspaceId = session.currentWorkspaceId;

    // Seed two projects via the API. We need a list, not an empty state,
    // so that the witness render counts exist before we touch anything.
    const projectIdA = await createProjectForWorkspace(page, {
      name: `Rerender Target A ${Date.now()}`,
      workspaceId,
    });
    const projectIdB = await createProjectForWorkspace(page, {
      name: `Rerender Witness B ${Date.now()}`,
      workspaceId,
    });

    await page.goto(new URL(`/projects/${workspaceId}/list`, page.url()).toString());
    await page.reload();
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("projects-list")).toBeVisible();

    const counterA = page.getByTestId(`directory-table-rendercount-${projectIdA}`);
    const counterB = page.getByTestId(`directory-table-rendercount-${projectIdB}`);
    await expect(counterA).toBeVisible();
    await expect(counterB).toBeVisible();
    await expect(counterA).toHaveText(/^renders: \d+$/);
    await expect(counterB).toHaveText(/^renders: \d+$/);

    // Baseline captured BEFORE any interaction — so the assertion covers
    // the full "open dialog + type" window. Opening the create dialog
    // must not re-render sibling rows, and neither must each keystroke.
    const baselineA = await counterA.textContent();
    const baselineB = await counterB.textContent();
    expect(baselineA).toMatch(/^renders: \d+$/);
    expect(baselineB).toMatch(/^renders: \d+$/);

    // Open the create dialog via the real trigger.
    await page.getByTestId("projects-create-button").click();
    const dialog = page.getByTestId("project-editor-dialog");
    await expect(dialog).toBeVisible();

    // After dialog open — no row render counts should have ticked.
    expect(await counterA.textContent()).toBe(baselineA);
    expect(await counterB.textContent()).toBe(baselineB);

    // Type into the name field. Each keystroke flips dialog state; if
    // any of it leaks up into the ProjectsPage owning the list, the
    // witness counts will jump.
    const nameField = dialog.getByLabel("Project name").first();
    await nameField.click();
    await expect(nameField).toBeFocused();
    await nameField.pressSequentially("hello world!", { delay: 20 });

    // After typing — still unchanged. This is the real regression gate.
    expect(await counterA.textContent()).toBe(baselineA);
    expect(await counterB.textContent()).toBe(baselineB);
  });
});
