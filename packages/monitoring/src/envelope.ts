import { wireLog, wireMetric } from "./format.ts";
import { wireSession, wireClientReport } from "./health.ts";
import { wireSpan } from "./wire-span.ts";
import type { Envelope, ErrorEvent, Integration } from "@sentry/core";
import { sanitizeEvent } from "./policy.ts";
import { sanitizeProfile, validId, type ProfileManifest } from "./profile.ts";
import type { TelemetryConfig } from "./policy.ts";

export interface ProfilePrivacy {
  enabled: boolean;
  manifest?: () => ProfileManifest | undefined;
  origin?: string;
}
export function envelopePrivacy(
  config: TelemetryConfig,
  component = "web",
  profiling?: ProfilePrivacy,
): Integration {
  return {
    name: "EnvelopePrivacy",
    setup(client) {
      const sanitize = (envelope: Envelope) => {
        const trace = envelope[0].trace;
        let spanTraceId: unknown;
        for (let index = envelope[1].length - 1; index >= 0; index--) {
          const item = envelope[1][index];
          if (!item) {
            envelope[1].splice(index, 1);
            continue;
          }
          try {
            const payload = item[1];
            if (
              item[0].type === "span" &&
              payload &&
              typeof payload === "object" &&
              "version" in payload &&
              payload.version === 2 &&
              "items" in payload &&
              Array.isArray(payload.items)
            ) {
              const items = (payload.items as unknown[]).flatMap((raw) =>
                wireSpan(raw, component, config, profiling?.enabled === true),
              );
              item[1] = {
                version: 2,
                items,
                ingest_settings: { infer_ip: "never", infer_user_agent: "never" },
              };
              const first: unknown = items[0];
              if (first && typeof first === "object" && "trace_id" in first)
                spanTraceId = first.trace_id;
              item[0] = {
                type: "span",
                content_type: "application/vnd.sentry.items.span.v2+json",
                item_count: items.length,
              };
            } else if (
              (item[0].type === "log" || item[0].type === "trace_metric") &&
              payload &&
              typeof payload === "object" &&
              "version" in payload &&
              payload.version === 2 &&
              "items" in payload &&
              Array.isArray(payload.items)
            ) {
              const type = item[0].type;
              const items =
                type === "log"
                  ? (payload.items as unknown[]).flatMap((raw) => wireLog(raw, component, config))
                  : (payload.items as unknown[]).flatMap((raw) =>
                      wireMetric(raw, component, config),
                    );
              if (!items.length) {
                envelope[1].splice(index, 1);
                continue;
              }
              item[0] =
                type === "log"
                  ? {
                      type: "log",
                      item_count: items.length,
                      content_type: "application/vnd.sentry.items.log+json",
                    }
                  : {
                      type: "trace_metric",
                      item_count: items.length,
                      content_type: "application/vnd.sentry.items.trace-metric+json",
                    };
              item[1] = {
                version: 2,
                ...(component !== "update"
                  ? {
                      ingest_settings: {
                        infer_ip: "never" as const,
                        infer_user_agent: "never" as const,
                      },
                    }
                  : {}),
                items,
              } as
                | import("@sentry/core").SerializedLogContainer
                | import("@sentry/core").SerializedMetricContainer;
            } else if (item[0].type === "session" && component !== "update") {
              const clean = wireSession(payload, config);
              if (clean) {
                item[0] = { type: "session" };
                item[1] = clean;
              } else envelope[1].splice(index, 1);
            } else if (item[0].type === "client_report") {
              const clean = wireClientReport(payload);
              if (clean) {
                item[0] = { type: "client_report" };
                item[1] = clean;
              } else envelope[1].splice(index, 1);
            } else if (item[0].type === "event") {
              item[0] = { type: "event" };
              item[1] = sanitizeEvent(payload as ErrorEvent, component, config);
            } else if (item[0].type === "profile_chunk" && profiling?.enabled) {
              const clean = sanitizeProfile(
                payload,
                config,
                profiling.manifest?.(),
                profiling.origin,
              );
              if (clean) {
                item[0] = { type: "profile_chunk", platform: "javascript" };
                item[1] = clean;
              } else envelope[1].splice(index, 1);
            } else envelope[1].splice(index, 1);
          } catch {
            envelope[1].splice(index, 1);
          }
        }
        const header = envelope[0];
        envelope[0] = {
          ...(validId(header.event_id) ? { event_id: header.event_id } : {}),
          ...(typeof header.sent_at === "string" && Number.isFinite(Date.parse(header.sent_at))
            ? { sent_at: header.sent_at }
            : {}),
          ...(header.dsn ? { dsn: config.dsn } : {}),
          sdk: {
            name:
              component === "update" ? "sentry.javascript.cloudflare" : "sentry.javascript.react",
            version: "11.13.0",
          },
        };
        const source = trace && typeof trace === "object" ? (trace as Record<string, unknown>) : {};
        const traceId = spanTraceId ?? source.trace_id;
        if (validId(traceId)) {
          const clean: Record<string, string> = {
            public_key: client.getDsn()?.publicKey ?? "",
            environment: config.environment,
            release: config.release,
            trace_id: traceId,
          };
          for (const key of ["sample_rate", "sample_rand"]) {
            const value = source[key];
            if (
              source.trace_id === traceId &&
              typeof value === "string" &&
              /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(value)
            )
              clean[key] = value;
          }
          if (
            source.trace_id === traceId &&
            (source.sampled === "true" || source.sampled === "false")
          )
            clean.sampled = source.sampled;
          envelope[0].trace = clean;
        } else delete envelope[0].trace;
      };
      client.on("beforeEnvelope", sanitize);
      const transport = client.getTransport();
      if (transport) {
        const send = transport.send.bind(transport);
        transport.send = (envelope) => {
          try {
            sanitize(envelope);
            if (!envelope[1].length) return Promise.resolve({});
            return Promise.resolve(send(envelope)).catch(() => ({}));
          } catch {
            return Promise.resolve({});
          }
        };
      }
    },
  };
}
