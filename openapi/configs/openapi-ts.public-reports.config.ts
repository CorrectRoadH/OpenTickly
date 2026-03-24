import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/toggl-reports-v3.swagger.json",
  },
  output: "./apps/website/src/shared/api/generated/public-reports",
});
