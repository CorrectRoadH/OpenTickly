export * from "../generated/admin/index.ts";

import { client } from "../generated/admin/client.gen.ts";
import { traceApiClient } from "../trace-client.ts";
traceApiClient(client);
