import os from "node:os";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: Math.min(os.cpus().length, 10),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: true,
  },
});
