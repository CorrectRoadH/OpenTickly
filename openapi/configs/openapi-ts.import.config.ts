import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/opentoggl-import.openapi.json",
  },
  output: {
    header: (ctx) => ["/* eslint-disable */", ...ctx.defaultValue],
    path: "./apps/website/src/shared/api/generated/import-api",
  },
});
