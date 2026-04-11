import os from "node:os";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 1,
  workers: Math.min(os.cpus().length, 10),
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    actionTimeout: 5_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: true,
    locale: "en-US",
  },
});
