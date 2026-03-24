import { expect, test } from "@playwright/test";

/**
 * Foundation browser lane smoke test: proves the reused 5173/8080 runtime setup works.
 *
 * This test validates that:
 * 1. The frontend (5173) and backend (8080) are reachable
 * 2. The browser can load the app and reach the backend through the frontend proxy
 * 3. The authentication flow works end-to-end
 *
 * This is the concrete proof that the "foundation browser lane" is implemented,
 * not only described in documentation.
 */
test.describe("Foundation: browser lane smoke", () => {
  test("reused 5173/8080 runtime is reachable and functional", async ({ page }) => {
    // Step 1: Verify the frontend is reachable
    await page.goto("http://localhost:5173");
    await expect(page).toHaveTitle(/./); // Any title means the page loaded

    // Step 2: Navigate to register and verify backend communication
    await page.goto("http://localhost:5173/register");
    const email = `foundation-smoke-${Date.now()}@example.com`;
    const password = "secret-pass";

    await page.getByLabel("Full name").fill("Foundation Smoke User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();

    // Step 3: Verify we land on timer page (proves backend processed the registration)
    await page.waitForURL(/\/timer(?:\?.*)?$/);
    await expect(page.getByTestId("app-shell")).toBeVisible();

    // Step 4: Verify the session bootstrap endpoint works through the frontend proxy
    const sessionResponse = await page.evaluate(async () => {
      const response = await fetch("/web/v1/session", {
        credentials: "include",
      });
      return { status: response.status, ok: response.ok };
    });
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.ok).toBe(true);

    // Step 5: Verify timer navigation is present
    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible();
  });

  test("backend readiness probe responds on 8080", async ({ page }) => {
    // This test verifies backend is reachable through the frontend proxy
    // We can't do a direct cross-origin fetch to 8080 due to CORS,
    // so we use the frontend proxy which forwards to the backend.
    // The /healthz endpoint is proxied to the backend's /readyz
    await page.goto("http://localhost:5173");
    const response = await page.evaluate(async () => {
      const res = await fetch("/healthz");
      return { status: res.status, ok: res.ok };
    });
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  test("frontend and backend ports are correctly configured for reuse", async ({ page }) => {
    // Verify the frontend is on 5173 and communicates with backend on 8080
    const email = `port-check-${Date.now()}@example.com`;
    const password = "secret-pass";

    // Register through the frontend proxy
    await page.goto("http://localhost:5173/register");
    await page.getByLabel("Full name").fill("Port Check User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await page.waitForURL(/\/timer(?:\?.*)?$/);

    // The session should be created by the backend on 8080
    const session = await page.evaluate(async () => {
      const response = await fetch("/web/v1/session", {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Session failed: ${response.status}`);
      return response.json();
    });

    expect(session.user).toBeDefined();
    expect(session.user.email).toBe(email);
    expect(session.current_workspace_id).toBeGreaterThan(0);
  });
});
