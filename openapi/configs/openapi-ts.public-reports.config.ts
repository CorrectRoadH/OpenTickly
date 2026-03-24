import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/toggl-reports-v3.swagger.json",
  },
  output: {
    header: (ctx) => ["/* eslint-disable */", ...ctx.defaultValue],
    path: "./apps/website/src/shared/api/generated/public-reports",
  },
});
