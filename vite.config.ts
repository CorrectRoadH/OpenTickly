import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    // Keep a single React instance when tests import @opentickly/web-ui, whose
    // baseui dependency graph resolves a parallel react@18 under packages/web-ui.
    dedupe: ["react", "react-dom"],
  },
  fmt: {
    ignorePatterns: ["docs/**", "openapi/**", ".factory/**"],
  },
  staged: {
    "vite.config.ts": "vp check --fix",
    "apps/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "apps/**/*.json": "vp check --fix",
    "packages/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "packages/**/*.json": "vp check --fix",
    "openapi/*.json": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["docs/**", "openapi/**", ".factory/**"],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    // Vitest replaces its default excludes when `exclude` is set, so keep the built-ins
    // and add the Playwright-owned e2e tree that broke the root JS test gate.
    // tests/cli-integration needs a live backend and has its own entrypoint (test:cli).
    exclude: ["**/node_modules/**", "**/.git/**", "**/e2e/**", "tests/cli-integration/**"],
    environment: "jsdom",
    setupFiles: ["./apps/website/src/test/setup.ts"],
  },
});
