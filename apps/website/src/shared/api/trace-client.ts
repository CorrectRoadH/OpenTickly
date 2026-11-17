import { captureTraceContext } from "@opentickly/monitoring/operations";
import type { Client } from "./generated/web/client/types.gen.ts";

type TraceableClient = Pick<Client, (typeof methods)[number] | "getConfig">;
const installed = new WeakSet<TraceableClient>();
const methods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "request",
  "trace",
] as const;

// Generated clients await auth/validation before fetch. Capture at the method's
// synchronous entry, then reactivate only while starting its actual fetch.
export function traceApiClient(client: TraceableClient) {
  if (installed.has(client)) return;
  installed.add(client);
  for (const name of methods) wrapMethod(client, name);
}
function wrapMethod<K extends (typeof methods)[number]>(client: TraceableClient, name: K) {
  const method = client[name];
  client[name] = ((options: Parameters<typeof method>[0]) => {
    const context = captureTraceContext();
    const configuredFetch = options.fetch ?? client.getConfig().fetch;
    const fetch: typeof globalThis.fetch = (input, init) =>
      context.run(() => {
        const transport = configuredFetch ?? globalThis.fetch;
        return transport(input, init);
      });
    return method({ ...options, fetch } as Parameters<Client["request"]>[0]);
  }) as typeof method;
}
