export * from "../generated/web/index.ts";
export { client } from "../generated/web/client.gen.ts";

import { client } from "../generated/web/client.gen.ts";
import { traceApiClient } from "../trace-client.ts";
traceApiClient(client);
client.setConfig({
  baseUrl: globalThis.location?.origin ?? "http://localhost",
  credentials: "same-origin",
});
