import type { Integration } from "@sentry/core";
import type { TelemetryConfig } from "./policy.ts";

export function envelopePrivacy(config: TelemetryConfig): Integration {
  return {
    name: "EnvelopePrivacy",
    setup(client) {
      client.on("beforeEnvelope", (envelope) => {
        const trace = envelope[0].trace;
        if (trace && typeof trace === "object") {
          const source = trace as Record<string, unknown>;
          const clean: Record<string, string> = {
            public_key: new URL(config.dsn).username,
            environment: config.environment,
            release: config.release,
          };
          if (typeof source.trace_id === "string" && /^[a-f0-9]{32}$/.test(source.trace_id))
            clean.trace_id = source.trace_id;
          for (const key of ["sample_rate", "sample_rand"]) {
            const value = source[key];
            if (typeof value === "string" && /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(value))
              clean[key] = value;
          }
          if (source.sampled === "true" || source.sampled === "false")
            clean.sampled = source.sampled;
          envelope[0].trace = clean;
        }
        for (let index = envelope[1].length - 1; index >= 0; index--) {
          const type = envelope[1][index]?.[0].type;
          if (type !== "event" && type !== "span") envelope[1].splice(index, 1);
        }
      });
    },
  };
}
