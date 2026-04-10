import { client } from "../../generated/public-webhooks/client.gen.ts";

client.setConfig({
  baseUrl: `${globalThis.location?.origin ?? "http://localhost"}/webhooks/api/v1`,
  credentials: "same-origin",
});

export * from "../../generated/public-webhooks/index.ts";
export { client } from "../../generated/public-webhooks/client.gen.ts";
