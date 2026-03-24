import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/opentoggl-admin.openapi.json",
  },
  output: "./apps/website/src/shared/api/generated/admin",
});
