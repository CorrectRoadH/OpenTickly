import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["suites/**/*.test.ts"],
    root: import.meta.dirname,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    sequence: {
      concurrent: false,
    },
  },
});
