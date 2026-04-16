import type { QueryParams } from "./validation.ts";
import type { WorkerEnv } from "./types.ts";

/**
 * Writes one data point per request that included a valid `instanceId` AND
 * `version` query param. Writes are silently dropped when:
 *   - the UPDATE_REQUESTS binding isn't bound
 *   - the caller didn't pass both required indexes
 *   - the Analytics Engine write throws
 *
 * Analytics Engine schema (query via CF REST API):
 *   index1 = instance_id
 *   blob1  = version
 *   blob2  = go_version
 *   blob3  = os
 *   blob4  = arch
 *   blob5  = locale
 *   blob6  = country (CF-derived ISO-2)
 */
export function recordUpdateRequest(env: WorkerEnv, query: QueryParams, request: Request): void {
  if (!env.UPDATE_REQUESTS) return;
  if (!query.instanceId || !query.version) return;
  const country = request.cf?.country;
  try {
    env.UPDATE_REQUESTS.writeDataPoint({
      indexes: [query.instanceId],
      blobs: [
        query.version,
        query.goVersion ?? "",
        query.os ?? "",
        query.arch ?? "",
        query.locale ?? "",
        typeof country === "string" ? country : "ZZ",
      ],
      doubles: [],
    });
  } catch (err) {
    // Analytics is best-effort. Never break the response on write failure.
    console.error("[update-worker] analytics write failed", err);
  }
}
