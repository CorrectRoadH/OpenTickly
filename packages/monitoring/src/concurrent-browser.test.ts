// @vitest-environment node
import { expect, it } from "vite-plus/test";
import { chromium, expect as browserExpect } from "@playwright/test";
import { build } from "vite";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Envelope, SerializedStreamedSpanContainer } from "@sentry/core";

it("keeps same-page interleaved operations isolated when B completes before A", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ot-concurrent-trace-"));
  const requests: { path: string; trace: string }[] = [];
  let script = "";
  const server = createServer((req, res) => {
    if (req.url === "/runtime.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(script);
      return;
    }
    if (req.url?.startsWith("/api/")) {
      requests.push({ path: req.url, trace: String(req.headers["sentry-trace"]) });
      res.end("{}");
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end('<html><body><script src="/runtime.js" defer></script></body></html>');
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await build({
      configFile: false,
      logLevel: "error",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        outDir: directory,
        emptyOutDir: true,
        minify: false,
        lib: {
          entry: resolve("packages/monitoring/src/concurrent-browser.fixture.ts"),
          formats: ["iife"],
          name: "Concurrent",
          fileName: () => "runtime.js",
        },
      },
    });
    script = await readFile(join(directory, "runtime.js"), "utf8");
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string") throw Error("missing address");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    await page.goto(`http://127.0.0.1:${address.port}`);
    await browserExpect(page.getByTestId("concurrent-trace")).toBeVisible();
    await page.evaluate("window.concurrent.start()");
    expect(await page.evaluate("window.concurrent.activeOp()")).toBe("pageload");
    await page.evaluate("window.concurrent.a()");
    await page.waitForFunction("window.concurrent.aAuth");
    await page.evaluate("window.concurrent.b()");
    await page.waitForFunction("window.concurrent.bAuth");
    await page.evaluate("window.concurrent.unowned()");
    await page.evaluate("window.concurrent.authA()");
    await page.waitForFunction("window.concurrent.aRequest");
    await page.evaluate("window.concurrent.authB()");
    await page.waitForFunction("window.concurrent.bDone");
    expect(await page.evaluate("window.concurrent.allDone")).toBe(false);
    await page.evaluate("window.concurrent.finishA()");
    await page.waitForFunction("window.concurrent.allDone");
    expect(await page.evaluate("window.concurrent.completionOrder")).toEqual(["B", "A"]);
    expect(await page.evaluate("window.concurrent.activeOp()")).not.toBe("ui.action");
    await page.waitForFunction("window.concurrent.pageloadEnded");
    await page.evaluate("window.concurrent.flush()");
    const envelopes = (await page.evaluate("window.concurrent.envelopes")) as Envelope[];
    const spans = envelopes.flatMap((e) =>
      e[1].flatMap((i) =>
        i[0].type === "span" ? (i[1] as SerializedStreamedSpanContainer).items : [],
      ),
    );
    expect(requests).toHaveLength(3);
    for (const request of requests) {
      const [trace, id] = request.trace.split("-");
      const http = spans.find((s) => s.trace_id === trace && s.span_id === id);
      if (request.path.endsWith("time_entries")) {
        expect(
          spans.find((s) => s.span_id === http?.parent_span_id)?.attributes["sentry.op"]?.value,
        ).toBe("pageload");
        continue;
      }
      const expected = request.path.endsWith("projects") ? "project.list" : "client.list";
      const business = spans.find(
        (s) => s.name === expected && s.attributes["sentry.op"]?.value === "ui.action",
      );
      expect(http?.parent_span_id, expected).toBe(business?.span_id);
      expect(
        spans.find((s) => s.span_id === business?.parent_span_id)?.attributes["sentry.op"]?.value,
      ).toBe("pageload");
    }
    const metrics = envelopes.flatMap((e) =>
      e[1].flatMap((i) =>
        i[0].type === "trace_metric"
          ? (i[1] as { items: { name: string; attributes: { operation?: { value: string } } }[] })
              .items
          : [],
      ),
    );
    for (const name of ["app.operation.count", "app.operation.duration"]) {
      expect(
        metrics
          .filter((m) => m.name === name)
          .map((m) => m.attributes.operation?.value)
          .sort((a, b) => (a ?? "").localeCompare(b ?? "")),
      ).toEqual(["client.list", "project.list"]);
    }
    if (process.env.SENTRY_TEST_ARTIFACT_DIR) {
      await writeFile(
        join(process.env.SENTRY_TEST_ARTIFACT_DIR, "trace-opentickly-fix-concurrent.json"),
        JSON.stringify(
          {
            requests,
            spans,
            countOperations: metrics
              .filter((m) => m.name === "app.operation.count")
              .map((m) => m.attributes.operation?.value),
            completionOrder: await page.evaluate("window.concurrent.completionOrder"),
            activeOperationAfterCompletion: await page.evaluate(
              "window.concurrent.activeOp() ?? null",
            ),
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await browser?.close();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
