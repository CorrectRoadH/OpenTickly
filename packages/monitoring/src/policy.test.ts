import { describe, expect, it } from "vite-plus/test";
import { sanitizeEvent, sanitizeSpan, telemetryConfig } from "./policy.ts";

const config = {
  dsn: "https://public@example.com/1",
  environment: "production",
  release: "web@test",
};
describe("telemetry privacy boundary", () => {
  it("rejects invalid or private DSNs", () => {
    expect(
      telemetryConfig({ ...config, dsn: "https://public:secret@example.com/1" }),
    ).toBeUndefined();
    expect(telemetryConfig({ ...config, dsn: "http://public@example.com/1" })).toBeUndefined();
    expect(telemetryConfig(config)).toEqual(config);
  });
  it("preserves business details and filters credentials from the entire error event", () => {
    const filename = "https://example.com/app.js?version=42&code=hidden-code";
    const result = sanitizeEvent(
      {
        type: undefined,
        message: "Failed to load report.tsv for workspace 42",
        user: { email: "hidden-user" },
        transaction: "report.load",
        tags: { route: "/reports/:id", "http.method": "GET", "http.status_code": "500" },
        extra: {
          nested: [{ token: "hidden-extra", report: "report.tsv" }],
          custom: { report: "report.tsv", toJSON: () => ({ token: "hidden-serialization" }) },
        },
        request: {
          url: "https://user:hidden-password@example.com/reports/42?q=quarterly&%73ig=hidden-sig&auth%5Btoken%5D=hidden-form-token",
          headers: {
            Authorization: "hidden-auth",
            "X-Session-Token": "hidden-header",
            Accept: "text/plain",
          },
          data: "hidden-body",
        },
        exception: {
          values: [
            {
              type: "ReportLoadError",
              value:
                "load report: Bearer hidden-bearer, sk-hidden-api, pk-hidden-api, eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoxfQ.signature, public",
              stacktrace: {
                frames: [{ filename, function: "run", lineno: 12, colno: 3 }],
              },
            },
          ],
        },
        debug_meta: {
          images: [{ type: "sourcemap", code_file: filename, debug_id: "a".repeat(32) }],
        },
      },
      "web",
      config,
    );
    expect(JSON.stringify(result)).not.toContain("hidden-");
    expect(result).toMatchObject({
      message: "Failed to load report.tsv for workspace 42",
      transaction: "report.load",
      tags: {
        component: "web",
        route: "/reports/:id",
        "http.method": "GET",
        "http.status_code": "500",
      },
      extra: {
        nested: [{ token: "[Filtered]", report: "report.tsv" }],
        custom: { report: "report.tsv" },
      },
      request: {
        url: "https://[Filtered]@example.com/reports/42?q=quarterly&%73ig=[Filtered]&auth%5Btoken%5D=[Filtered]",
        headers: {
          Authorization: "[Filtered]",
          "X-Session-Token": "[Filtered]",
          Accept: "text/plain",
        },
      },
      exception: {
        values: [
          {
            type: "ReportLoadError",
            value: "load report: Bearer [Filtered], [Filtered], [Filtered], [Filtered], [Filtered]",
            stacktrace: {
              frames: [
                {
                  filename: "https://example.com/app.js?version=42&code=[Filtered]",
                  function: "run",
                  lineno: 12,
                  colno: 3,
                },
              ],
            },
          },
        ],
      },
    });
    expect(result.debug_meta?.images?.[0]).toMatchObject({
      code_file: result.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
      debug_id: "a".repeat(32),
    });
    expect(sanitizeEvent(result, "web", config)).toEqual(result);
  });
  it("rebuilds root and child streamed spans with a fixed component", () => {
    for (const parent_span_id of [undefined, "1234567890123456"]) {
      const result = sanitizeSpan(
        {
          trace_id: "a".repeat(32),
          span_id: "b".repeat(16),
          parent_span_id,
          name: "SENSITIVE",
          start_timestamp: 1,
          end_timestamp: 2,
          status: "ok",
          is_segment: !parent_span_id,
          attributes: {
            "db.query.text": "SENSITIVE",
            "sentry.op": "SENSITIVE",
            "sentry.segment.name": "SENSITIVE",
            nested: { value: { token: "SENSITIVE" }, type: "string" },
          },
        } as never,
        "web",
        config,
      );
      expect(JSON.stringify(result)).not.toContain("SENSITIVE");
      expect(result.attributes.component).toBe("web");
      expect(result.trace_id).toBe("a".repeat(32));
    }
  });
});
