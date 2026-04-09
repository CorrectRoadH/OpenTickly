import { expect, type Page, type TestInfo } from "@playwright/test";

import type { WebSessionBootstrapDto } from "../../src/shared/api/web-contract.ts";

export type E2eWorkspaceSession = {
  currentWorkspaceId: number;
};

export async function registerE2eUser(
  page: Page,
  testInfo: TestInfo,
  options: {
    email: string;
    fullName: string;
    password: string;
  },
): Promise<void> {
  await page.goto(resolveAppUrl(resolveAppBaseUrl(testInfo), "/register"));

  // Wait for the full auth form to be stable before interacting.
  // The PublicAuthRoute renders SessionPendingPanel → Suspense fallback → AuthPage,
  // so the form may mount/remount. Waiting for the submit button ensures the form is ready.
  await expect(page.getByRole("button", { name: "Register" })).toBeVisible();

  await page.getByLabel("Full name").fill(options.fullName);
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Register" }).click();

  await page.waitForURL(/\/timer(?:\?.*)?$/);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  // Complete the post-registration onboarding dialog if it appears.
  await completeOnboardingDialogIfVisible(page);

  // Desktop shell has the Organization sidebar button; mobile shell does not.
  const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
  if (await organizationButton.isVisible().catch(() => false)) {
    const session = await readSessionBootstrap(page);
    await expect(organizationButton).toContainText(resolveCurrentOrganizationName(session));
  }
}

export async function loginE2eUser(
  page: Page,
  testInfo: TestInfo,
  options: {
    email: string;
    password: string;
  },
): Promise<E2eWorkspaceSession> {
  await page.goto(resolveAppUrl(resolveAppBaseUrl(testInfo), "/login"));

  // Wait for the full auth form to be stable before interacting.
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/timer(?:\?.*)?$/);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await completeOnboardingDialogIfVisible(page);

  const currentWorkspaceId = await resolveCurrentWorkspaceId(page);

  // Desktop shell has the Organization sidebar button; mobile shell does not.
  const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
  if (await organizationButton.isVisible().catch(() => false)) {
    const session = await readSessionBootstrap(page);
    await expect(organizationButton).toContainText(resolveCurrentOrganizationName(session));
  }

  return {
    currentWorkspaceId,
  };
}

/**
 * Completes the onboarding dialog if it is visible.
 * This helper is called automatically by registerE2eUser, but can also be used
 * after loginE2eUser when testing onboarding-related flows.
 *
 * @param page - The Playwright page object.
 */
export async function completeOnboardingDialogIfVisible(page: Page): Promise<void> {
  // Complete onboarding via API — this is the authoritative mechanism.
  const apiResult = await page.evaluate(async () => {
    try {
      const response = await fetch("/web/v1/onboarding", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1 }),
      });
      return response.ok;
    } catch {
      return false;
    }
  });

  // If the dialog is visible, the React Query cache still has stale data.
  // Reload so the onboarding query refetches and sees completed=true.
  const dialog = page.getByTestId("onboarding-dialog");
  if (apiResult && (await dialog.isVisible({ timeout: 500 }).catch(() => false))) {
    await page.reload();
    await expect(page.getByTestId("app-shell")).toBeVisible();
  }
}

export async function readSessionBootstrap(page: Page): Promise<WebSessionBootstrapDto> {
  return page.evaluate(async () => {
    const response = await fetch("/web/v1/session", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Session bootstrap request failed with ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Polling-safe version of readSessionBootstrap.
 *
 * Catches errors (including 500s during workspace switch) and returns null instead of throwing.
 * This allows Playwright's expect.poll() to continue retrying when transient errors occur,
 * rather than failing immediately on the first error.
 *
 * Use this in poll() callbacks. For direct calls where you need the session data,
 * use readSessionBootstrap() instead.
 */
export async function pollSessionBootstrap(
  page: Page,
  maxRetries = 3,
  delayMs = 300,
): Promise<WebSessionBootstrapDto | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await readSessionBootstrap(page);
      return result;
    } catch {
      // Session read failed (e.g., 500 during workspace switch).
      // Return null to signal "not ready yet" so poll continues retrying.
      if (attempt < maxRetries - 1) {
        await page.waitForTimeout(delayMs);
      }
    }
  }
  // All retries exhausted - return null so poll times out naturally
  // instead of failing with an unhandled error.
  return null;
}

export async function createTimeEntryForWorkspace(
  page: Page,
  options: {
    description: string;
    projectId?: number;
    start: string;
    stop: string;
    tagIds?: number[];
    workspaceId: number;
  },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/time_entries`, {
      body: JSON.stringify({
        created_with: "playwright-e2e",
        description: request.description,
        duration: Math.round((Date.parse(request.stop) - Date.parse(request.start)) / 1000),
        project_id: request.projectId,
        start: request.start,
        stop: request.stop,
        tag_ids: request.tagIds,
        workspace_id: request.workspaceId,
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Create time entry failed with ${response.status}`);
    }

    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

export async function createProjectForWorkspace(
  page: Page,
  options: {
    name: string;
    workspaceId: number;
  },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/projects`, {
      body: JSON.stringify({
        name: request.name,
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Create project failed with ${response.status}`);
    }

    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

export async function createTagForWorkspace(
  page: Page,
  options: {
    name: string;
    workspaceId: number;
  },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(`/api/v9/workspaces/${request.workspaceId}/tags`, {
      body: JSON.stringify({
        name: request.name,
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Create tag failed with ${response.status}`);
    }

    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

export async function createTaskForProject(
  page: Page,
  options: {
    name: string;
    projectId: number;
    workspaceId: number;
  },
): Promise<number> {
  return page.evaluate(async (request) => {
    const response = await fetch(
      `/api/v9/workspaces/${request.workspaceId}/projects/${request.projectId}/tasks`,
      {
        body: JSON.stringify({
          name: request.name,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(`Create task failed with ${response.status}`);
    }

    const payload = await response.json();
    return payload.id ?? 0;
  }, options);
}

function resolveAppBaseUrl(testInfo: TestInfo): string {
  const configuredBaseUrl = testInfo.project.use.baseURL;

  if (typeof configuredBaseUrl === "string" && configuredBaseUrl.length > 0) {
    return configuredBaseUrl;
  }

  return process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
}

function resolveAppUrl(appBaseUrl: string, pathname: string): string {
  return new URL(pathname, appBaseUrl).toString();
}

async function resolveCurrentWorkspaceId(page: Page): Promise<number> {
  const session = await readSessionBootstrap(page);
  return session.current_workspace_id ?? session.workspaces[0]?.id ?? 0;
}

function resolveCurrentOrganizationName(session: WebSessionBootstrapDto): string {
  const currentOrganizationId =
    session.current_organization_id ??
    session.workspaces.find((workspace) => workspace.id === session.current_workspace_id)
      ?.organization_id;

  return (
    session.organizations.find((organization) => organization.id === currentOrganizationId)?.name ??
    ""
  );
}
