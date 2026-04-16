import type { CheckRequestInput } from "./validation.ts";
import type { WorkerEnv } from "./types.ts";

/**
 * Writes one data point per /v1/check request.
 *
 * Analytics Engine schema (query with SQL via CF REST API):
 *   index1 = instance_id          — for COUNT(DISTINCT) DAU
 *   blob1  = version              — "0.3.1", "dev", ...
 *   blob2  = go_version           — "go1.23.4" or ""
 *   blob3  = os                   — "linux", "darwin", "windows", ...
 *   blob4  = arch                 — "amd64", "arm64", ...
 *   blob5  = locale               — optional UI locale hint
 *   blob6  = country              — CF-derived ISO-2 country, or "ZZ" if unknown
 *
 * doubles is unused — every event is a single check-in, aggregated via COUNT().
 */
export function recordCheckin(env: WorkerEnv, payload: CheckRequestInput, request: Request): void {
  const country = request.cf?.country ?? "ZZ";
  try {
    env.ANALYTICS.writeDataPoint({
      indexes: [payload.instanceId],
      blobs: [
        payload.version,
        payload.goVersion ?? "",
        payload.os ?? "",
        payload.arch ?? "",
        payload.locale ?? "",
        typeof country === "string" ? country : "ZZ",
      ],
      doubles: [],
    });
  } catch (err) {
    // Analytics is best-effort. Never break the response on write failure.
    console.error("[update-worker] analytics write failed", err);
  }
}
