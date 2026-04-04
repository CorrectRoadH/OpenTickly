import * as fs from "node:fs";
import { expect, test } from "@playwright/test";

import { loginE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Upgrade smoke — verify phase (runs against main after migration).
 *
 * Reads the seed credentials written by upgrade-seed.spec.ts, logs in with
 * the v0.0.17 account, and asserts that the time entries seeded before the
 * upgrade are still present and accessible.
 */

const SEED_FILE = "/tmp/upgrade-seed.json";

test("verify: v0.0.17 data survives migration to main", async ({ page }) => {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8")) as {
    email: string;
    password: string;
    workspaceId: number;
    entryCount: number;
  };

  // Login with the account that was created on v0.0.17
  const session = await loginE2eUser(page, test.info(), {
    email: seed.email,
    password: seed.password,
  });

  expect(session.currentWorkspaceId).toBe(seed.workspaceId);

  // Fetch time entries via API and assert all seeded entries are still there
  const entries = await page.evaluate(
    async ({ workspaceId }: { workspaceId: number }) => {
      const response = await fetch(`/api/v9/workspaces/${workspaceId}/time_entries`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`time_entries fetch failed: ${response.status}`);
      }
      return response.json() as Promise<unknown[]>;
    },
    { workspaceId: seed.workspaceId },
  );

  expect(Array.isArray(entries)).toBe(true);
  expect(entries.length).toBeGreaterThanOrEqual(seed.entryCount);

  // Verify the seeded entries are visible in the UI (timer page loaded)
  await expect(page.getByTestId("app-shell")).toBeVisible();
});
