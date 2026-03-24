import { client } from "../../generated/public-reports/client.gen.ts";

client.setConfig({
  baseUrl: globalThis.location?.origin ?? "http://localhost",
  credentials: "same-origin",
});

export * from "../../generated/public-reports/index.ts";
export { client } from "../../generated/public-reports/client.gen.ts";
