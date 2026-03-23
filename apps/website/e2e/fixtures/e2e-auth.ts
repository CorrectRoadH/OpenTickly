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
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByLabel("Organization")).toBeVisible();
  await expect(page.getByLabel("Organization")).toContainText(
    resolveCurrentOrganizationName(session),
  );
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

  await expect(page.getByLabel("Organization")).toBeVisible();
  await expect(page.getByLabel("Organization")).toContainText(
    resolveCurrentOrganizationName(session),
  );

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
