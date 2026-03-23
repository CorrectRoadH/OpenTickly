import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { loginE2eUser, readSessionBootstrap, registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: enter the tracking shell", () => {
  test("Given a newly registered account, when the user signs back in, then the time-entry shell loads", async ({
    page,
  }) => {
    const email = `real-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Real Runtime User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const currentWorkspaceName =
      (await readSessionBootstrap(page)).workspaces.find(
        (workspace) => workspace.id === loginSession.currentWorkspaceId,
      )?.name ?? "";

    await expect(page.getByLabel("Organization")).toBeVisible();
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("shell-primary-nav")).toContainText("Track");
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible();
  });

  test("Given the shell organization switcher, when the user opens it, then the dropdown remains fully visible inside the viewport", async ({
    page,
  }) => {
    const email = `workspace-switcher-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Workspace Switcher User",
      password,
    });

    await page.context().clearCookies();
    const loginSession = await loginE2eUser(page, test.info(), { email, password });
    const sessionBootstrap = await readSessionBootstrap(page);
    const currentWorkspaceName =
      sessionBootstrap.workspaces.find(
        (workspace) => workspace.id === loginSession.currentWorkspaceId,
      )?.name ?? "";

    const organizationButton = page.getByLabel("Organization");
    await expect(organizationButton).toContainText(currentWorkspaceName);

    await organizationButton.click();
    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();
    const currentWorkspaceOption = workspaceListbox.getByRole("button", {
      name: currentWorkspaceName,
    });
    await expect(currentWorkspaceOption).toBeVisible();
    await expectNoOverflowClipping(workspaceListbox);
    await expectNoOverflowClipping(currentWorkspaceOption);
  });

  test("Given the shell organization switcher, when the user creates an organization from the dropdown, then the new organization appears and can be selected", async ({
    page,
  }) => {
    const email = `organization-create-${test.info().workerIndex}-${Date.now()}@example.com`;
    const password = "secret-pass";
    const organizationName = `Organization ${Date.now()}`;

    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Organization Create User",
      password,
    });

    await page.context().clearCookies();
    await loginE2eUser(page, test.info(), { email, password });

    const organizationButton = page.getByLabel("Organization");
    await organizationButton.click();

    const workspaceListbox = page.getByRole("listbox");
    await expect(workspaceListbox).toBeVisible();
    await expectNoOverflowClipping(workspaceListbox);

    await page.getByRole("button", { name: "Create organization" }).click();

    const createOrganizationDialog = page.getByRole("dialog", { name: "New organization" });
    await expect(createOrganizationDialog).toBeVisible();
    await createOrganizationDialog.getByLabel("Organization name").fill(organizationName);
    await createOrganizationDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(organizationButton).toContainText(organizationName);

    await organizationButton.click();
    await expect(workspaceListbox.getByRole("button", { name: organizationName })).toBeVisible();
  });
});

async function expectNoOverflowClipping(locator: Locator): Promise<void> {
  await expect
    .poll(async () => {
      return locator.evaluate((element: HTMLElement) => {
        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return false;
        }

        let current: HTMLElement | null = element.parentElement;
        while (current) {
          const style = window.getComputedStyle(current);
          const clipsX =
            style.overflowX === "hidden" ||
            style.overflowX === "clip" ||
            style.overflowX === "auto";
          const clipsY =
            style.overflowY === "hidden" ||
            style.overflowY === "clip" ||
            style.overflowY === "auto";

          if (clipsX || clipsY) {
            const parentRect = current.getBoundingClientRect();

            if (clipsX && (rect.left < parentRect.left || rect.right > parentRect.right)) {
              return false;
            }

            if (clipsY && (rect.top < parentRect.top || rect.bottom > parentRect.bottom)) {
              return false;
            }
          }

          current = current.parentElement;
        }

        return (
          rect.left >= 0 &&
          rect.top >= 0 &&
          rect.right <= window.innerWidth &&
          rect.bottom <= window.innerHeight
        );
      });
    })
    .toBe(true);
}
