import type { ErrorEvent } from "@sentry/core";
import type { TelemetryConfig } from "./policy.ts";

const filtered = "[Filtered]";
const credentialHeader = /authorization|cookie|token|secret|key|password|passwd/i;
const credentialKey =
  /(?:^|[_.[\]-])(?:token|secret|password|passwd|api[_-]?key|signature|sig|session|(?:auth|oauth|authorization|verification)[_.-]?code)(?:$|[_.[\]-])/i;
const queryPair = /(^|[?&#])([^=?&#\s"'<>]+)=([^&#\s"'<>]*)/g;

function sensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  return /^code$/i.test(normalized) || credentialKey.test(normalized);
}

function queryKey(key: string): string {
  try {
    return decodeURIComponent(key.replaceAll("+", " "));
  } catch {
    return key;
  }
}

function filterText(value: string, publicKey: RegExp): string {
  return value
    .replace(queryPair, (pair, separator: string, key: string) =>
      sensitiveKey(queryKey(key)) ? `${separator}${key}=${filtered}` : pair,
    )
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/?#@\s"'<>]+@/gi, `$1${filtered}@`)
    .replace(/\b(Bearer(?:\s|%20|%09)+)[a-z0-9._~+/=-]+/gi, `$1${filtered}`)
    .replace(/\b(?:sk|pk)-[a-z0-9_-]+\b/gi, filtered)
    .replace(/\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, filtered)
    .replace(publicKey, filtered);
}

function filterValues<T>(input: T, publicKey: RegExp): T {
  const ancestors = new WeakSet<object>();
  function visit(value: unknown, fields = false, headers = false): unknown {
    if (typeof value === "string") return filterText(value, publicKey);
    if (typeof value === "function") return undefined;
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Date) {
      const time = Date.prototype.getTime.call(value);
      return Number.isFinite(time) ? new Date(time).toISOString() : null;
    }
    if (ancestors.has(value)) return "[Circular]";
    ancestors.add(value);
    const clean = Array.isArray(value)
      ? value.map((item) => visit(item, fields, headers))
      : Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            key,
            (headers ? credentialHeader.test(key) : fields && sensitiveKey(key))
              ? filtered
              : visit(
                  entry,
                  fields || /^(?:contexts|tags|extra|vars|data|query_string)$/i.test(key),
                  key.toLowerCase() === "headers",
                ),
          ]),
        );
    ancestors.delete(value);
    return clean;
  }
  return visit(input) as T;
}

export function sanitizeEvent(
  event: ErrorEvent,
  component: string,
  config: TelemetryConfig,
): ErrorEvent {
  const key = new URL(config.dsn).username;
  const publicKey = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  const { user: _user, server_name: _serverName, request, ...details } = event;
  let requestMetadata: ErrorEvent["request"];
  if (request) {
    const { data: _data, cookies: _cookies, env: _env, ...metadata } = request;
    requestMetadata = metadata;
  }
  return filterValues(
    {
      ...details,
      ...(requestMetadata ? { request: requestMetadata } : {}),
      release: config.release,
      environment: config.environment,
      tags: { ...details.tags, component },
    },
    publicKey,
  );
}
