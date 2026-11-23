// @vitest-environment node
import { expect, it } from "vite-plus/test";
import { chromium, expect as browserExpect, type Page } from "@playwright/test";
import type { Envelope, ErrorEvent, ProfileChunk } from "@sentry/core";
import { build } from "vite";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { SourceMap } from "node:module";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { profileAssets } from "../../../tools/sentry-profile-assets.ts";

const listen = async (server: Server) => {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("missing address");
  return `http://127.0.0.1:${address.port}`;
};
async function expectReportError(page: Page, component: string) {
  await page.evaluate("window.runtime.flush()");
  const event = await page.evaluate<ErrorEvent>("window.runtime.wireEvents.at(-1)");
  expect(event?.tags?.component).toBe(component);
  const frame = expect.objectContaining({
    filename: expect.stringMatching(/\/runtime\.js$/),
    function: "throwReportLoadError",
    lineno: expect.any(Number),
    colno: expect.any(Number),
  });
  const stacktrace = expect.objectContaining({ frames: expect.arrayContaining([frame]) });
  const thrown = expect.objectContaining({
    type: "ReportLoadError",
    value: "Could not load report.tsv: Bearer [Filtered]",
    stacktrace,
  });
  const cause = expect.objectContaining({
    type: "SyntaxError",
    value: "Invalid report metadata: Bearer [Filtered]",
    mechanism: expect.objectContaining({ source: "cause", parent_id: 0 }),
    stacktrace,
  });
  expect(event?.exception?.values).toEqual([cause, thrown]);
}

it("uses real Chromium SDK fetch guard, parent sampling, and native profile transport", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ot-sentry-browser-"));
  const outside: string[] = [];
  const incoming: { trace?: string; baggage?: string }[] = [];
  const receiver = createServer((req, res) => {
    outside.push(JSON.stringify(req.headers));
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "sentry-trace,baggage");
    res.end("outside");
  });
  const external = await listen(receiver);
  let script = "";
  let manifest = "";
  const server = createServer((req, res) => {
    if (req.url === "/runtime.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(script);
      return;
    }
    if (req.url === "/sentry-profile-assets.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(manifest);
      return;
    }
    if (req.url?.startsWith("/web/v1/redirect") || req.url === "/api/v9/desktop_login") {
      res.writeHead(req.url.endsWith("307") ? 307 : 302, {
        Location: external + "/capture",
        "Access-Control-Allow-Origin": "*",
      });
      res.end();
      return;
    }
    if (req.url === "/web/v1/data" || req.url === "/api/v9/me/time_entries") {
      incoming.push({
        trace: req.headers["sentry-trace"] as string,
        baggage: req.headers.baggage as string,
      });
      res.setHeader("Content-Type", "application/json");
      res.end("{}");
      return;
    }
    res.setHeader("Document-Policy", "js-profiling");
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html><body><script src="/runtime.js" defer></script></body></html>');
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await build({
      configFile: false,
      plugins: [profileAssets("web@" + "a".repeat(40))],
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      logLevel: "error",
      build: {
        outDir: directory,
        emptyOutDir: true,
        minify: false,
        sourcemap: true,
        lib: {
          entry: resolve("packages/monitoring/src/browser-runtime.fixture.ts"),
          formats: ["iife"],
          name: "Runtime",
          fileName: () => "runtime.js",
        },
      },
    });
    script = await readFile(join(directory, "runtime.js"), "utf8");
    manifest = await readFile(join(directory, "sentry-profile-assets.json"), "utf8");
    const origin = await listen(server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => console.error("browser harness", error.message));
    await page.goto(origin);
    await browserExpect(page.getByTestId("telemetry-runtime")).toBeVisible();
    expect(await page.evaluate(() => "Profiler" in window)).toBe(true);
    const evaluate = (expression: string) => page.evaluate(expression);
    await evaluate('window.runtime.request("/web/v1/data")');
    expect(incoming[0]?.trace).toMatch(/^[a-f0-9]{32}-[a-f0-9]{16}-1$/);
    expect(incoming[0]?.baggage).toContain("sentry-public_key=public");
    expect(incoming[0]?.baggage).not.toContain("transaction");
    await evaluate(
      'window.runtime.request("/web/v1/data", "follow", "sentry-user_id=SENSITIVE,other=SENSITIVE")',
    );
    expect(incoming.at(-1)?.baggage).not.toContain("SENSITIVE");
    await evaluate("window.runtime.xhr()");
    expect(incoming.at(-1)?.trace).toBeUndefined();
    await evaluate(`window.runtime.request(${JSON.stringify(external + "/normal")})`);
    expect(outside.join(" ")).not.toContain("sentry-trace");
    expect(outside.join(" ")).not.toContain("baggage");
    outside.length = 0;
    expect(await evaluate('window.runtime.request("/api/v9/desktop_login")')).toBe("cors");
    expect(outside).toHaveLength(1);
    expect(outside[0]).not.toContain("sentry-trace");
    expect(outside[0]).not.toContain("baggage");
    outside.length = 0;

    for (const status of [302, 307])
      expect(await evaluate(`window.runtime.request("/web/v1/redirect${status}")`)).toBe(
        "TypeError",
      );
    expect(await evaluate('window.runtime.request("/web/v1/redirect307", "manual")')).toBe(
      "opaqueredirect",
    );
    expect(outside).toEqual([]);
    await evaluate('window.runtime.parent("0", "cccccccccccccccccccccccccccccccc")');
    expect(incoming.at(-1)?.trace).toMatch(/^cccccccccccccccccccccccccccccccc-[a-f0-9]{16}-0$/);
    await evaluate('window.runtime.parent("1", "dddddddddddddddddddddddddddddddd")');
    expect(incoming.at(-1)?.trace).toMatch(/^dddddddddddddddddddddddddddddddd-[a-f0-9]{16}-1$/);
    await page.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "session" && i[1].errors === 0 && i[1].status === "ok"))',
    );
    await evaluate("window.runtime.session(true); window.runtime.flush()");
    await page.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "session" && i[1].errors === 1 && i[1].status === "ok"))',
    );
    await evaluate("window.runtime.session(false); window.runtime.flush()");
    await page.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "session" && i[1].status === "unhandled"))',
    );
    await evaluate("window.runtime.reportDrop()");
    await page.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "client_report"))',
    );
    await evaluate("window.runtime.profile()");
    await page.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "profile_chunk"))',
    );
    await evaluate("window.runtime.flush()");
    const result = await page.evaluate<Envelope[]>("window.runtime.envelopes");
    const items = result.flatMap<Envelope[1][number]>(([, items]) => items);
    const sessions = items.flatMap(([header, payload]) =>
      header.type === "session" ? [payload as Record<string, unknown>] : [],
    );
    expect(new Set(sessions.map((s) => s.sid)).size).toBe(1);
    expect(sessions[0]?.init).toBe(true);
    expect(sessions.at(-1)?.init).toBe(false);
    expect(JSON.stringify(sessions)).not.toMatch(/did|ip_address|user_agent/);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SENSITIVE");
    await expectReportError(page, "web");
    expect(serialized).toContain("sentry.profiler_id");
    expect(serialized).toContain("thread.id");
    expect(serialized).toContain('"function":"staticWork"');
    expect(serialized).toContain('"function":"redacted"');
    const map = JSON.parse(await readFile(join(directory, "runtime.js.map"), "utf8"));
    const chunks = items.flatMap(([header, payload]) =>
      header.type === "profile_chunk" ? [payload as ProfileChunk] : [],
    );
    const frame = chunks.flatMap((c) => c.profile.frames).find((f) => f.function === "staticWork");
    expect(frame?.lineno).toBeGreaterThan(0);
    const mapped = new SourceMap(map).findEntry((frame?.lineno ?? 1) - 1, (frame?.colno ?? 1) - 1);
    expect("originalSource" in mapped ? mapped.originalSource : undefined).toContain(
      "browser-runtime.fixture.ts",
    );
    const spans = items.flatMap(([header, payload]) =>
      header.type === "span"
        ? (payload as import("@sentry/core").SerializedStreamedSpanContainer).items
        : [],
    );
    expect(
      spans.some((s) =>
        chunks.some(
          (c) =>
            c.profiler_id === s.attributes["sentry.profiler_id"]?.value &&
            s.attributes["thread.id"]?.type === "integer" &&
            s.attributes["thread.id"]?.value === 0 &&
            s.attributes["sentry.thread.id"]?.type === "string" &&
            s.attributes["sentry.thread.id"]?.value === "0" &&
            c.profile.samples.some(
              (sample) =>
                sample.timestamp >= s.start_timestamp && sample.timestamp <= s.end_timestamp,
            ),
        ),
      ),
    ).toBe(true);
    const landingPage = await browser.newPage();
    landingPage.setDefaultTimeout(5000);
    await landingPage.goto(origin + "/?landing&unsampled");
    await browserExpect(landingPage.getByTestId("telemetry-runtime")).toBeVisible();
    await landingPage.waitForFunction(
      'window.runtime.capturedMetrics.some(m => m.name === "app.operation.count")',
    );
    await landingPage.evaluate("window.runtime.flush()");
    await landingPage.waitForFunction(
      'window.runtime.envelopes.some(e => e[1].some(i => i[0].type === "trace_metric" && i[1].items.some(m => m.name === "app.operation.count" && m.attributes.operation.value === "site.page.load")))',
    );
    expect(
      await landingPage.evaluate(
        'window.runtime.envelopes.some(e=>e[1].some(i=>i[0].type === "span"))',
      ),
    ).toBe(false);
    await landingPage.evaluate("window.runtime.session(true)");
    await expectReportError(landingPage, "landing");
    await landingPage.close();
    const [outboundTrace, outboundSpan] = (incoming[0]?.trace ?? "").split("-");
    const httpSpan = spans.find(
      (span) => span.trace_id === outboundTrace && span.span_id === outboundSpan,
    );
    expect(httpSpan?.name).toBe("time_entry.list");
    const business = spans.find((span) => span.span_id === httpSpan?.parent_span_id);
    expect(business?.name).toBe("report.load");
    expect(
      spans.find((span) => span.span_id === business?.parent_span_id)?.attributes["sentry.op"]
        ?.value,
    ).toBe("pageload");
    expect(spans.some((span) => span.trace_id === "cccccccccccccccccccccccccccccccc")).toBe(false);
    const disabledPage = await browser.newPage();
    await disabledPage.goto(origin + "/?disabled");
    await browserExpect(disabledPage.getByTestId("telemetry-runtime")).toBeVisible();
    expect(await disabledPage.evaluate("window.runtime.fetchUnchanged")).toBe(true);
    expect(await disabledPage.evaluate('window.runtime.request("/web/v1/redirect307")')).toBe(
      "cors",
    );
    expect(outside).toHaveLength(1);
    expect(outside[0]).not.toContain("sentry-trace");
    await disabledPage.close();
    outside.length = 0;
    if (process.env.SENTRY_TEST_ARTIFACT_DIR) {
      await page.screenshot({ path: join(process.env.SENTRY_TEST_ARTIFACT_DIR, "chromium.png") });
      await writeFile(
        join(process.env.SENTRY_TEST_ARTIFACT_DIR, "chromium-summary.json"),
        JSON.stringify({
          chunks: chunks.length,
          samples: chunks.map((c) => c.profile.samples.length),
          mappedSource: "browser-runtime.fixture.ts",
          redirectReceiverRequests: outside.length,
          correlated: true,
        }),
      );
    }
    const failedGuard = await browser.newPage();
    await failedGuard.goto(origin + "/?guard-failure");
    await browserExpect(failedGuard.getByTestId("telemetry-runtime")).toBeVisible();
    const beforeFailure = outside.length;
    expect(await failedGuard.evaluate('window.runtime.request("/web/v1/redirect")')).toBe("cors");
    expect(outside.slice(beforeFailure)).toHaveLength(1);
    expect(outside.slice(beforeFailure).join("")).not.toMatch(/sentry-trace|baggage/);
    await failedGuard.evaluate("window.runtime.session(true); window.runtime.flush()");
    expect(
      await failedGuard.evaluate(
        'window.runtime.envelopes.flatMap(e => e[1]).some(([h]) => h.type === "event")',
      ),
    ).toBe(true);
  } finally {
    await browser?.close();
    await Promise.all([
      new Promise<void>((done) => server.close(() => done())),
      new Promise<void>((done) => receiver.close(() => done())),
    ]);
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
