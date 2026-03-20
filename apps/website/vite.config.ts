import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

const webProxyTarget = process.env.OPENTOGGL_WEB_PROXY_TARGET ?? "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/healthz": {
        target: webProxyTarget,
      },
      "/web/v1": {
        target: webProxyTarget,
      },
    },
  },
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/__tests__/**/*.ts",
      "src/**/__tests__/**/*.tsx",
    ],
    environment: "jsdom",
    exclude: ["e2e/**"],
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
