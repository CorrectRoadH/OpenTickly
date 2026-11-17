import { getActiveSpan, getClient, logger, metrics, type Span } from "@sentry/core";
import { startInactiveSpan } from "@sentry/core/browser";
import { captureTraceContext, contextForSpan, type OperationContext } from "./operation-context.ts";
export { captureTraceContext };
export type { OperationContext };

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
export function traceOperation<T>(
  operation: BusinessOperation,
  callback: (context: OperationContext) => T,
  existingSpan?: Span,
): T {
  if (!getClient()) return callback(captureTraceContext());
  const parent = getActiveSpan();
  const top = !parent || !operationStates.has(parent);
  const started = performance.now();
  const run = (span: Span): T => {
    const context = contextForSpan(span);
    const state = { failed: false };
    operationStates.set(span, state);
    const record = (outcome: "success" | "error" | "cancelled" | "rejected") =>
      context.run(() => {
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
      });
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
      if (!existingSpan) span.end();
      throw error;
    };
    const completed = (value: unknown) => {
      const status = value instanceof Response ? value.status : 0;
      const outcome =
        state.failed || status >= 500 ? "error" : status >= 400 ? "rejected" : "success";
      span.setAttribute("outcome", outcome);
      if (status) span.setAttribute("http.response.status_code", status);
      if (outcome !== "success") span.setStatus({ code: 2 });
      record(outcome);
    };
    try {
      const result = context.run(() => callback(context));
      if (
        result &&
        typeof result === "object" &&
        "then" in result &&
        typeof result.then === "function"
      ) {
        return Promise.resolve(result).then((value) => {
          completed(value);
          if (!existingSpan) span.end();
          return value;
        }, failed) as T;
      }
      completed(result);
      if (!existingSpan) span.end();
      return result;
    } catch (error) {
      return failed(error);
    }
  };
  if (existingSpan) return run(existingSpan);
  const op =
    operation === "update.request"
      ? "http.server"
      : operation === "update.upstream.fetch"
        ? "http.client"
        : operation === "update.cache.read"
          ? "cache.get"
          : operation.startsWith("update.")
            ? "task"
            : "ui.action";
  return run(startInactiveSpan({ name: operationName(operation) ? operation : op, op }));
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
