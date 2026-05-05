import { expect, test } from "@playwright/test";

import { loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

const PUBLIC_WEBHOOK_CALLBACK_URL = "https://example.com";

// --- API helpers ---

async function createWebhookViaApi(
  page: import("@playwright/test").Page,
  workspaceId: number,
  options: { description: string; urlCallback: string },
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  return page.evaluate(
    async (params: { workspaceId: number; description: string; urlCallback: string }) => {
      const response = await fetch(`/webhooks/api/v1/subscriptions/${params.workspaceId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: params.description,
          url_callback: params.urlCallback,
          enabled: false,
          event_filters: [{ entity: "time_entry", action: "created" }],
        }),
      });
      const body = await response.json();
      return { ok: response.ok, status: response.status, body };
    },
    {
      workspaceId,
      description: options.description,
      urlCallback: options.urlCallback,
    },
  );
}

async function listWebhooksViaApi(
  page: import("@playwright/test").Page,
  workspaceId: number,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  return page.evaluate(async (wid: number) => {
    const response = await fetch(`/webhooks/api/v1/subscriptions/${wid}`, {
      credentials: "include",
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  }, workspaceId);
}

async function deleteWebhookViaApi(
  page: import("@playwright/test").Page,
  workspaceId: number,
  subscriptionId: number,
): Promise<{ ok: boolean; status: number }> {
  return page.evaluate(
    async (params: { workspaceId: number; subscriptionId: number }) => {
      const response = await fetch(
        `/webhooks/api/v1/subscriptions/${params.workspaceId}/${params.subscriptionId}`,
        { method: "DELETE", credentials: "include" },
      );
      return { ok: response.ok, status: response.status };
    },
    { workspaceId, subscriptionId },
  );
}

// --- Setup ---

async function setupUser(page: import("@playwright/test").Page, prefix: string) {
  const email = `wh-${prefix}-${test.info().workerIndex}-${Date.now()}@example.com`;
  const password = "secret-pass";

  await registerE2eUser(page, test.info(), {
    email,
    fullName: "Webhook Test User",
    password,
  });

  await page.context().clearCookies();
  const session = await loginE2eUser(page, test.info(), { email, password });
  return { workspaceId: session.currentWorkspaceId };
}

// --- Tests ---

test.describe("Webhooks API", () => {
  test("GET /subscriptions returns an array for a workspace with no webhooks", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "api-list-empty");

    const result = await listWebhooksViaApi(page, workspaceId);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body).toHaveLength(0);
  });

  test("POST /subscriptions creates a webhook and GET returns it", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "api-create");

    const createResult = await createWebhookViaApi(page, workspaceId, {
      description: `test-hook-${Date.now()}`,
      urlCallback: PUBLIC_WEBHOOK_CALLBACK_URL,
    });

    expect(createResult, JSON.stringify(createResult)).toMatchObject({ ok: true });
    expect(createResult.status).toBe(200);
    expect(createResult.body.subscription_id).toBeDefined();
    expect(createResult.body.secret).toBeDefined();
    expect(createResult.body.description).toContain("test-hook-");

    const listResult = await listWebhooksViaApi(page, workspaceId);
    expect(listResult.ok).toBe(true);
    expect(Array.isArray(listResult.body)).toBe(true);
    expect(listResult.body).toHaveLength(1);
  });

  test("DELETE /subscriptions removes a webhook", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "api-delete");

    const createResult = await createWebhookViaApi(page, workspaceId, {
      description: `delete-me-${Date.now()}`,
      urlCallback: PUBLIC_WEBHOOK_CALLBACK_URL,
    });
    expect(createResult, JSON.stringify(createResult)).toMatchObject({ ok: true });
    const subscriptionId = createResult.body.subscription_id as number;

    const deleteResult = await deleteWebhookViaApi(page, workspaceId, subscriptionId);
    expect(deleteResult.ok).toBe(true);

    const listResult = await listWebhooksViaApi(page, workspaceId);
    expect(Array.isArray(listResult.body)).toBe(true);
    expect(listResult.body).toHaveLength(0);
  });

  test("GET /event_filters returns supported filters", async ({ page }) => {
    await setupUser(page, "api-filters");

    const result = await page.evaluate(async () => {
      const response = await fetch("/webhooks/api/v1/event_filters", {
        credentials: "include",
      });
      return { ok: response.ok, status: response.status, body: await response.json() };
    });

    expect(result.ok).toBe(true);
    expect(result.body).toHaveProperty("time_entry");
    expect(result.body).toHaveProperty("project");
    expect(result.body).toHaveProperty("client");
  });

  test("GET /status returns ok", async ({ page }) => {
    await setupUser(page, "api-status");

    const result = await page.evaluate(async () => {
      const response = await fetch("/webhooks/api/v1/status", {
        credentials: "include",
      });
      return { ok: response.ok, body: await response.json() };
    });

    expect(result.ok).toBe(true);
    expect(result.body.status).toBe("ok");
  });
});

test.describe("Webhooks UI", () => {
  test("Given no webhooks, the integrations page shows the empty state", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "ui-empty");

    await page.goto(`/workspaces/${workspaceId}/integrations`);
    await expect(page.getByTestId("integrations-page")).toBeVisible();
  });

  test("Given a webhook created via API, the integrations page lists it", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "ui-list");
    const hookName = `ui-hook-${Date.now()}`;

    await createWebhookViaApi(page, workspaceId, {
      description: hookName,
      urlCallback: PUBLIC_WEBHOOK_CALLBACK_URL,
    });

    await page.goto(`/workspaces/${workspaceId}/integrations`);
    await expect(page.getByTestId("integrations-page")).toBeVisible();
    await expect(page.getByText(hookName)).toBeVisible();
  });

  test("Checkboxes in the create-webhook dialog toggle when clicked", async ({ page }) => {
    const { workspaceId } = await setupUser(page, "ui-checkbox");

    await page.goto(`/workspaces/${workspaceId}/integrations`);
    await expect(page.getByTestId("integrations-page")).toBeVisible();

    // Open create dialog
    await page
      .getByRole("button", { name: /create/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // The "enabled" checkbox should start unchecked, then toggle on click
    const enabledCheckbox = page.getByRole("checkbox", { name: /enabled/i });
    await expect(enabledCheckbox).not.toBeChecked();
    await enabledCheckbox.click();
    await expect(enabledCheckbox).toBeChecked();
    await enabledCheckbox.click();
    await expect(enabledCheckbox).not.toBeChecked();

    // An event-filter checkbox (e.g. "time_entry created") should also toggle
    const filterCheckbox = page.getByRole("checkbox", { name: "time_entry created" });
    await expect(filterCheckbox).not.toBeChecked();
    await filterCheckbox.click();
    await expect(filterCheckbox).toBeChecked();
  });
});
