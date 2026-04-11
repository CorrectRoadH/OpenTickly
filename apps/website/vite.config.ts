import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite-plus";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localEnvPath = path.join(workspaceRoot, ".env.local");

function readLocalEnvironment() {
  const values: Record<string, string> = {};
  if (!fs.existsSync(localEnvPath)) {
    return values;
  }

  const contents = fs.readFileSync(localEnvPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice(7) : line;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const value = normalizedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

export default defineConfig(() => {
  const localEnv = readLocalEnvironment();
  const webProxyTarget =
    process.env.OPENTOGGL_WEB_PROXY_TARGET ??
    localEnv.OPENTOGGL_WEB_PROXY_TARGET ??
    "http://127.0.0.1:8080";

  return {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "18" }]],
        },
      }),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          id: "/",
          name: "OpenToggl",
          short_name: "OpenToggl",
          description: "Open-source time tracking",
          start_url: "/m/timer",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#1a1a2e",
          background_color: "#1a1a2e",
          categories: ["productivity", "business"],
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
    build: {
      modulePreload: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react") && !id.includes("react-router")) return "vendor-react";
              if (id.includes("@tanstack/react-query")) return "vendor-query";
              if (id.includes("@tanstack/react-router")) return "vendor-router";
              if (id.includes("react-hook-form") || id.includes("zod")) return "vendor-forms";
              if (id.includes("baseui") || id.includes("styletron")) return "vendor-baseui";
              if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
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
        "/insights/api/v1": {
          target: webProxyTarget,
        },
        "/reports/api/v3": {
          target: webProxyTarget,
        },
        "/web/v1": {
          target: webProxyTarget,
        },
        // Import API — do not remove, required for Toggl data migration
        "/import/v1": {
          target: webProxyTarget,
        },
        "/admin/v1": {
          target: webProxyTarget,
        },
        "/webhooks/api/v1": {
          target: webProxyTarget,
        },
        "/files": {
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
