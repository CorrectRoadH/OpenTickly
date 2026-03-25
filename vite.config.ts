import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["docs/upstream/**", "openapi/**", ".factory/**"],
  },
  staged: {
    "vite.config.ts": "vp check --fix",
    "apps/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "apps/**/*.json": "vp check --fix",
    "packages/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "packages/**/*.json": "vp check --fix",
    "docs/**/*.md": "vp check --fix",
    "openapi/*.json": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["docs/upstream/**", "openapi/**", ".factory/**"],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    // Vitest replaces its default excludes when `exclude` is set, so keep the built-ins
    // and add the Playwright-owned e2e tree that broke the root JS test gate.
    exclude: ["**/node_modules/**", "**/.git/**", "**/e2e/**"],
    setupFiles: ["./apps/website/src/test/setup.ts"],
  },
});
