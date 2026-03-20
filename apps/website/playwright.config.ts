import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  webServer: {
    command: "vp dev --host 127.0.0.1 --port 4173",
    env: {
      ...process.env,
      OPENTOGGL_WEB_PROXY_TARGET:
        process.env.OPENTOGGL_WEB_PROXY_TARGET ?? "http://127.0.0.1:8080",
    },
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
