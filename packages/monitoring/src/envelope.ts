import type { Integration } from "@sentry/core";
import type { TelemetryConfig } from "./policy.ts";

export function envelopePrivacy(config: TelemetryConfig): Integration {
  return {
    name: "EnvelopePrivacy",
    setup(client) {
      client.on("beforeEnvelope", (envelope) => {
        const trace = envelope[0].trace;
        let spanTraceId: unknown;
        for (let index = envelope[1].length - 1; index >= 0; index--) {
          const item = envelope[1][index];
          if (!item) {
            envelope[1].splice(index, 1);
            continue;
          }
          const payload = item[1];
          if (
            item[0].type === "span" &&
            payload &&
            typeof payload === "object" &&
            "items" in payload &&
            Array.isArray(payload.items)
          ) {
            const first: unknown = payload.items[0];
            if (first && typeof first === "object" && "trace_id" in first)
              spanTraceId = first.trace_id;
            item[0] = {
              type: "span",
              content_type: "application/vnd.sentry.items.span.v2+json",
              item_count: payload.items.length,
            };
          } else if (item[0].type === "event") item[0] = { type: "event" };
          else envelope[1].splice(index, 1);
        }
        const source = trace && typeof trace === "object" ? (trace as Record<string, unknown>) : {};
        const traceId = spanTraceId ?? source.trace_id;
        if (typeof traceId === "string" && /^[a-f0-9]{32}$/.test(traceId)) {
          const clean: Record<string, string> = {
            public_key: client.getDsn()?.publicKey ?? "",
            environment: config.environment,
            release: config.release,
            trace_id: traceId,
          };
          for (const key of ["sample_rate", "sample_rand"]) {
            const value = source[key];
            if (typeof value === "string" && /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(value))
              clean[key] = value;
          }
          if (source.sampled === "true" || source.sampled === "false")
            clean.sampled = source.sampled;
          envelope[0].trace = clean;
        } else delete envelope[0].trace;
      });
    },
  };
}
