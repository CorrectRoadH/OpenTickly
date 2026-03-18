import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "vite.config.ts": "vp check --fix",
    "apps/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "packages/**/*.{ts,tsx,js,jsx,mjs,cjs,css}": "vp check --fix",
    "docs/**/*.md": "vp check --fix",
    "openapi/*.json": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
