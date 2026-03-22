import { client } from "../../generated/public-track/client.gen.ts";

client.setConfig({
  baseUrl: `${globalThis.location?.origin ?? "http://localhost"}/api/v9`,
  credentials: "same-origin",
});

export * from "../../generated/public-track/index.ts";
export { client } from "../../generated/public-track/client.gen.ts";
