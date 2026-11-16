import { defineConfig } from "vite-plus";
import { sentryBuild } from "../../tools/sentry-build.ts";
const sentry = sentryBuild("update", "opentickly-update", "dist");
export default defineConfig({
  plugins: sentry.plugins,
  define: {
    __SENTRY_UPDATE_RELEASE__: JSON.stringify(sentry.release),
    __SENTRY_UPDATE_PRODUCTION__: "true",
  },
  build: {
    ssr: "src/index.ts",
    outDir: "dist",
    sourcemap: "hidden",
    minify: true,
    rollupOptions: { external: [/^node:/, /^cloudflare:/], output: { entryFileNames: "index.js" } },
  },
  ssr: { noExternal: true },
});
