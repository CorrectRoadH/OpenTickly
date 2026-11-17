import {
  getRootSpan,
  logger,
  metrics,
  spanToJSON,
  withActiveSpan,
  type Integration,
} from "@sentry/core";
/** Automatic landing page/navigation spans are real top-level local operations. */
export function landingMetrics(): Integration {
  return {
    name: "LandingOperationMetrics",
    setup(client) {
      client.on("spanEnd", (span) => {
        const value = spanToJSON(span);
        if (
          span !== getRootSpan(span) ||
          (value.name !== "site.page.load" && value.name !== "site.navigation") ||
          typeof value.end_timestamp !== "number"
        )
          return;
        const outcome = value.status === "error" ? "error" : "success";
        const attributes = { operation: value.name, outcome };
        withActiveSpan(span, () => {
          metrics.count("app.operation.count", 1, { attributes });
          metrics.distribution(
            "app.operation.duration",
            Math.max(0, (value.end_timestamp! - value.start_timestamp) * 1000),
            { unit: "millisecond", attributes },
          );
          if (outcome === "error") logger.error("operation.failed", attributes);
        });
      });
    },
  };
}
