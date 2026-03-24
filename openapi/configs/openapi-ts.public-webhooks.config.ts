import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/toggl-webhooks-v1.swagger.json",
  },
  output: "./apps/website/src/shared/api/generated/public-webhooks",
});
