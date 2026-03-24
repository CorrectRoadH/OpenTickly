import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/opentoggl-web.openapi.json",
  },
  output: {
    header: (ctx) => ["/* eslint-disable */", ...ctx.defaultValue],
    path: "./apps/website/src/shared/api/generated/web",
  },
});
