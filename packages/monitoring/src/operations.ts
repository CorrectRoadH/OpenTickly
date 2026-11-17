import { getActiveSpan, getClient, logger, metrics } from "@sentry/core";
import { startSpan } from "@sentry/core/browser";

export const businessOperations = [
  "auth.login",
  "auth.logout",
  "auth.sso.resolve",
  "timer.start",
  "timer.stop",
  "time_entry.list",
  "time_entry.create",
  "time_entry.update",
  "time_entry.delete",
  "project.list",
  "project.save",
  "client.list",
  "client.save",
  "report.load",
  "report.export",
  "import.run",
  "webhook.handle",
  "update.check",
  "site.page.load",
  "site.navigation",
  "site.docs.open",
  "site.download.open",
  "site.install_guide.copy",
  "update.request",
  "update.cache.read",
  "update.upstream.fetch",
  "update.response",
  "update.analytics",
] as const;
export type BusinessOperation = (typeof businessOperations)[number];
const names = new Set<string>(businessOperations);
export function operationName(value: unknown): value is BusinessOperation {
  return typeof value === "string" && names.has(value);
}
const operationStates = new WeakMap<object, { failed: boolean }>();
export function traceOperation<T>(operation: BusinessOperation, callback: () => T): T {
  const parent = getActiveSpan();
  const top = !parent || !operationStates.has(parent);
  const started = performance.now();
  return startSpan(
    { name: operationName(operation) ? operation : "ui.action", op: "ui.action" },
    (span) => {
      const state = { failed: false };
      operationStates.set(span, state);
      const record = (outcome: "success" | "error" | "cancelled" | "rejected") => {
        if (!getClient()) return;
        const attributes = { operation, outcome };
        if (top) {
          metrics.count("app.operation.count", 1, { attributes });
          metrics.distribution("app.operation.duration", Math.max(0, performance.now() - started), {
            unit: "millisecond",
            attributes,
          });
        }
        if (outcome === "error") logger.error("operation.failed", attributes);
      };
      const failed = (error: unknown): never => {
        const cancelled =
          error && typeof error === "object" && "name" in error && error.name === "AbortError";
        const rejected =
          error &&
          typeof error === "object" &&
          "status" in error &&
          typeof error.status === "number" &&
          error.status >= 400 &&
          error.status < 500;
        const outcome = cancelled ? "cancelled" : rejected ? "rejected" : "error";
        span.setAttribute("outcome", outcome);
        record(outcome);
        span.setStatus({ code: 2 });
        throw error;
      };
      try {
        const result = callback();
        if (
          result &&
          typeof result === "object" &&
          "then" in result &&
          typeof result.then === "function"
        ) {
          return Promise.resolve(result).then((value) => {
            const outcome = state.failed ? "error" : "success";
            span.setAttribute("outcome", outcome);
            record(outcome);
            return value;
          }, failed) as T;
        }
        const outcome = state.failed ? "error" : "success";
        span.setAttribute("outcome", outcome);
        record(outcome);
        return result;
      } catch (error) {
        return failed(error);
      }
    },
  );
}

export function markOperationFailure() {
  const span = getActiveSpan();
  if (span) {
    const state = operationStates.get(span);
    if (state) state.failed = true;
  }
  span?.setStatus({ code: 2 });
  span?.setAttribute("outcome", "error");
}
