import { expect, test } from "@playwright/test";

type RuntimeSessionPayload = {
  current_workspace_id: number;
  workspaces: Array<{
    id: number;
    name: string;
  }>;
};

test("real runtime: login reaches workspace shell without API stubs", async ({ page }) => {
  const email = `real-runtime-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await page.goto("/register");

  await page.getByLabel("Full name").fill("Real Runtime User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const registerResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/auth/register") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Register" }).click();
  const registerResponse = await registerResponsePromise;
  const registerBody = await registerResponse.text();

  expect(
    registerResponse.status(),
    `Expected POST /web/v1/auth/register to return 201, got ${registerResponse.status()} with body: ${registerBody}`,
  ).toBe(201);

  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/auth/login") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Log in" }).click();
  const loginResponse = await loginResponsePromise;
  const loginBody = await loginResponse.text();

  expect(
    loginResponse.status(),
    `Expected POST /web/v1/auth/login to return 200, got ${loginResponse.status()} with body: ${loginBody}`,
  ).toBe(200);

  const loginSession = parseRuntimeSession(loginBody, "/web/v1/auth/login");
  const currentWorkspace = loginSession.workspaces.find(
    (workspace) => workspace.id === loginSession.current_workspace_id,
  );

  expect(
    currentWorkspace,
    `Expected login session payload to include current workspace ${loginSession.current_workspace_id}; body: ${loginBody}`,
  ).toBeDefined();

  const sessionResponse = await page.waitForResponse(
    (response) =>
      response.url().includes("/web/v1/session") && response.request().method() === "GET",
  );
  const sessionBody = await sessionResponse.text();

  expect(
    sessionResponse.status(),
    `Expected GET /web/v1/session to return 200, got ${sessionResponse.status()} with body: ${sessionBody}`,
  ).toBe(200);

  await expect(page).toHaveURL(new RegExp(`/workspaces/${loginSession.current_workspace_id}$`));
  await expect(page.getByRole("heading", { name: "Workspace Overview" })).toBeVisible();
  await expect(page.getByLabel("Workspace")).toHaveValue(String(loginSession.current_workspace_id));
  await expect(page.getByRole("main").getByText(currentWorkspace!.name)).toBeVisible();
});

function parseRuntimeSession(body: string, source: string): RuntimeSessionPayload {
  const payload = JSON.parse(body) as Partial<RuntimeSessionPayload>;

  if (typeof payload.current_workspace_id !== "number" || !Array.isArray(payload.workspaces)) {
    throw new Error(`Expected ${source} to return a session payload with workspace data: ${body}`);
  }

  return {
    current_workspace_id: payload.current_workspace_id,
    workspaces: payload.workspaces.map((workspace) => ({
      id: Number(workspace.id),
      name: String(workspace.name),
    })),
  };
}
