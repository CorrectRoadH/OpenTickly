import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { loadEnv } from "vite";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, "");
  const webProxyTarget = env.OPENTOGGL_WEB_PROXY_TARGET ?? "http://127.0.0.1:8080";

  return {
    envDir: workspaceRoot,
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
  };
});
