import type { Page } from "@playwright/test";

/**
 * Polls GET /api/v9/me/time_entries/current until a running entry appears.
 * Returns `{ status, body }` where body is the entry object or null on timeout.
 */
export async function pollCurrentRunningEntry(
  page: Page,
  { timeoutMs = 5_000 }: { timeoutMs?: number } = {},
) {
  return page.evaluate(async (timeout: number) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const response = await fetch("/api/v9/me/time_entries/current", {
        credentials: "include",
      });
      if (response.ok) {
        const body = await response.json();
        if (body !== null) return { status: response.status, body };
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    // Final attempt — return whatever the API gives
    const response = await fetch("/api/v9/me/time_entries/current", {
      credentials: "include",
    });
    return { status: response.status, body: await response.json() };
  }, timeoutMs);
}

/**
 * Fetches GET /api/v9/me/time_entries/current once (no polling).
 * Use for assertions where null is the expected result (e.g. after stopping a timer).
 */
export async function fetchCurrentEntry(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v9/me/time_entries/current", {
      credentials: "include",
    });
    return { status: response.status, body: await response.json() };
  });
}
