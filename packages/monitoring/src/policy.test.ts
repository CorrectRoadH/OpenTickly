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
  it("rebuilds errors without nested business fields", () => {
    const result = sanitizeEvent(
      {
        type: undefined,
        message: "SENSITIVE",
        user: { email: "SENSITIVE" },
        extra: { nested: { token: "SENSITIVE" } },
        request: {
          url: "https://example.com/SENSITIVE?q=SENSITIVE",
          headers: { Cookie: "SENSITIVE" },
        },
        exception: {
          values: [
            {
              type: "Error",
              value: "SENSITIVE",
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/app.js?q=SENSITIVE",
                    function: "run",
                    vars: { secret: "SENSITIVE" },
                    context_line: "SENSITIVE",
                  },
                ],
              },
            },
          ],
        },
      },
      "web",
      config,
    );
    expect(JSON.stringify(result)).not.toContain("SENSITIVE");
    expect(result.tags).toEqual({ component: "web" });
    expect(result.exception?.values?.[0]?.stacktrace?.frames?.[0]?.function).toBe("run");
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
