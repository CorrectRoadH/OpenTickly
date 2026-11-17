import type { TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";

/** Native boundary below SDK instrumentation; no request body is cloned or read. */
export function installHeaderBoundary(
  host: { fetch: typeof fetch },
  targets: RegExp[],
  origin: string,
  config: TelemetryConfig,
) {
  if (!targets.length) return;
  const original = host.fetch;
  const publicKey = new URL(config.dsn).username;
  host.fetch = function (input, init) {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let allowed = false;
    try {
      const url = new URL(raw, origin);
      allowed = !url.username && !url.password && targets.some((target) => target.test(url.href));
    } catch {
      /* Native fetch reports invalid input. */
    }
    if (!allowed) return original.call(host, input, init);
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const trace = headers.get("sentry-trace");
    if (!trace && !headers.has("baggage")) return original.call(host, input, init);
    const match = trace?.match(/^([a-f0-9]{32})-([a-f0-9]{16})-([01])$/);
    const source = headers.get("baggage") ?? "";
    headers.delete("baggage");
    if (!match || !validId(match[1]) || !validId(match[2], 16)) headers.delete("sentry-trace");
    else {
      const clean: Record<string, string> = {
        trace_id: match[1],
        public_key: publicKey,
        environment: config.environment,
        release: config.release,
        sampled: match[3] === "1" ? "true" : "false",
      };
      for (const entry of source.split(",")) {
        const [key, value] = entry.trim().split("=");
        if (
          (key === "sentry-sample_rate" || key === "sentry-sample_rand") &&
          /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(value ?? "")
        )
          clean[key.slice(7)] = value;
      }
      headers.set(
        "baggage",
        Object.entries(clean)
          .map(([key, value]) => `sentry-${key}=${encodeURIComponent(value)}`)
          .join(","),
      );
    }
    return original.call(host, input, { ...init, headers });
  };
}
