import * as fs from "node:fs";
import { expect, test } from "@playwright/test";

import { createTimeEntryForWorkspace, loginE2eUser, registerE2eUser } from "./fixtures/e2e-auth.ts";

/**
 * Upgrade smoke — seed phase (runs against v0.0.17).
 *
 * Registers a user, creates time entries, and writes the account credentials
 * to /tmp/upgrade-seed.json so the verify phase can read them after the
 * backend has been upgraded to main.
 */

const SEED_FILE = "/tmp/upgrade-seed.json";
const SEED_EMAIL = `upgrade-smoke-${Date.now()}@example.com`;
const SEED_PASSWORD = "upgrade-secret-1";
const ENTRY_COUNT = 3;

test("seed: register user and create time entries on v0.0.17", async ({ page }) => {
  await registerE2eUser(page, test.info(), {
    email: SEED_EMAIL,
    fullName: "Upgrade Smoke User",
    password: SEED_PASSWORD,
  });

  const session = await loginE2eUser(page, test.info(), {
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
  });

  const today = new Date().toISOString().slice(0, 10);
  const entryIds: number[] = [];

  for (let i = 0; i < ENTRY_COUNT; i++) {
    const id = await createTimeEntryForWorkspace(page, {
      description: `upgrade-smoke-entry-${i}`,
      start: `${today}T0${8 + i}:00:00Z`,
      stop: `${today}T0${8 + i}:30:00Z`,
      workspaceId: session.currentWorkspaceId,
    });
    entryIds.push(id);
  }

  expect(entryIds).toHaveLength(ENTRY_COUNT);
  expect(entryIds.every((id) => id > 0)).toBe(true);

  fs.writeFileSync(
    SEED_FILE,
    JSON.stringify({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      workspaceId: session.currentWorkspaceId,
      entryCount: ENTRY_COUNT,
    }),
  );
});
