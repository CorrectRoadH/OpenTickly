import { getActiveSpan, withActiveSpan, type Span } from "@sentry/core";

export interface OperationContext {
  run<T>(callback: () => T): T;
}

export function contextForSpan(span: Span | undefined): OperationContext {
  return {
    run<T>(callback: () => T): T {
      if (!span) return callback();
      let result!: T;
      // The scope callback is synchronous even when the business result is a Promise.
      withActiveSpan(span, () => {
        result = callback();
      });
      return result;
    },
  };
}

export function captureTraceContext(): OperationContext {
  return contextForSpan(getActiveSpan());
}
