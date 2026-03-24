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
  await page.getByLabel("Full name").fill(options.fullName);
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Register" }).click();

  await page.waitForURL(/\/timer(?:\?.*)?$/);
  const _currentWorkspaceId = await resolveCurrentWorkspaceId(page);
  const session = await readSessionBootstrap(page);
  const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(organizationButton).toBeVisible();
  await expect(organizationButton).toContainText(resolveCurrentOrganizationName(session));
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
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/timer(?:\?.*)?$/);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  const currentWorkspaceId = await resolveCurrentWorkspaceId(page);
  const session = await readSessionBootstrap(page);
  const organizationButton = page.getByRole("button", { exact: true, name: "Organization" });

  await expect(organizationButton).toBeVisible();
  await expect(organizationButton).toContainText(resolveCurrentOrganizationName(session));

  return {
    currentWorkspaceId,
  };
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

export async function createTimeEntryForWorkspace(
  page: Page,
  options: {
    description: string;
    projectId?: number;
    start: string;
    stop: string;
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
