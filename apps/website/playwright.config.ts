import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Controlled parallel workers: default to 2 for CI safety, allow env override.
  // Tests use workerIndex-based email uniqueness for fixture isolation.
  workers: parseInt(process.env.PLAYWRIGHT_WORKERS || "2"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: true,
  },
});
