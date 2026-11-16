import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite-plus";
import * as MdxConfig from "./source.config";

import { sentryBuild } from "../../tools/sentry-build.ts";
const sentry = sentryBuild("landing", "opentickly-landing", "build");

export default defineConfig({
  envDir: "../..",
  define: { "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(sentry.release) },
  build: { sourcemap: "hidden" },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  plugins: [mdx(MdxConfig), tailwindcss(), reactRouter(), ...sentry.plugins],
  resolve: {
    alias: {
      "@": resolve(__dirname, "app"),
      collections: resolve(__dirname, ".source"),
    },
  },
});
