import { traceApiClient } from "../trace-client.ts";
import { client } from "../generated/import-api/client.gen.ts";

traceApiClient(client);
client.setConfig({
  baseUrl: globalThis.location?.origin ?? "http://localhost",
  credentials: "same-origin",
});

export * from "../generated/import-api/index.ts";
export { client } from "../generated/import-api/client.gen.ts";
