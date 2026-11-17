import type { Integration } from "@sentry/core";
import type { TelemetryConfig } from "./policy.ts";
import { validId } from "./profile.ts";

export function safeDsc(config: TelemetryConfig): Integration {
  return {
    name: "SafeDynamicSamplingContext",
    setup(client) {
      client.on("createDsc", (dsc) => {
        const clean: Record<string, string> = {};
        if (validId(dsc.trace_id)) {
          clean.trace_id = dsc.trace_id;
          clean.public_key = client.getDsn()?.publicKey ?? "";
          clean.environment = config.environment;
          clean.release = config.release;
          for (const key of ["sample_rate", "sample_rand"] as const) {
            const value = dsc[key];
            if (typeof value === "string" && /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(value))
              clean[key] = value;
          }
          if (dsc.sampled === "true" || dsc.sampled === "false") clean.sampled = dsc.sampled;
        }
        for (const key of Object.keys(dsc)) delete dsc[key as keyof typeof dsc];
        Object.assign(dsc, clean);
      });
    },
  };
}
