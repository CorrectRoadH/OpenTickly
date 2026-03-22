import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: {
    path: "./openapi/opentoggl-import.openapi.json",
  },
  output: "./apps/website/src/shared/api/generated/import-api",
});
