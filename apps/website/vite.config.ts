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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react") && !id.includes("react-router"))
                return "vendor-react";
              if (id.includes("@tanstack/react-query")) return "vendor-query";
              if (id.includes("@tanstack/react-router")) return "vendor-router";
              if (id.includes("react-hook-form") || id.includes("zod"))
                return "vendor-forms";
              if (id.includes("baseui") || id.includes("styletron"))
                return "vendor-baseui";
            }
          },
        },
      },
    },
    server: {
      proxy: {
        "/healthz": {
          target: webProxyTarget,
        },
        "/api/v9": {
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
