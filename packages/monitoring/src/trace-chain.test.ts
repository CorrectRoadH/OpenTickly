// @vitest-environment node
import { expect, it } from "vite-plus/test";
import { chromium, expect as browserExpect } from "@playwright/test";
import { build } from "vite";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { SerializedStreamedSpanContainer } from "@sentry/core";

it.skipIf(!process.env.OPENTICKLY_TRACE_REDIS_URL)(
  "links Chromium pageload → business → HTTP → real Go route → business → PostgreSQL",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "ot-trace-chain-"));
    const backend = spawn(
      "go",
      [
        "test",
        "./apps/backend/internal/bootstrap",
        "-run",
        "^TestBrowserTraceFixture$",
        "-count=1",
        "-v",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENTICKLY_TRACE_FIXTURE: "1",
          OPENTICKLY_TRACE_HTML: join(directory, "index.html"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    backend.stderr.on("data", (data) => {
      output += String(data);
    });
    const exited = new Promise<number | null>((done) => backend.on("exit", done));
    const ready = new Promise<string>((done, fail) => {
      backend.stdout.on("data", (data) => {
        output += String(data);
        const match = output.match(/TRACE_FIXTURE_READY=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) done(match[1]!);
      });
      backend.on("error", fail);
      backend.on("exit", () => fail(Error("fixture failed: " + output)));
    });
    const browserBodies: string[] = [];
    const sent: { trace: string; status: number }[] = [];

    let api: string | undefined;
    const server = createServer((req, res) => {
      if (req.url?.startsWith("/assets/")) {
        void readFile(join(directory, req.url)).then(
          (content) => {
            res.setHeader("Content-Type", "text/javascript");
            res.end(content);
          },
          () => {
            res.writeHead(404);
            res.end();
          },
        );
        return;
      }
      if (req.url?.startsWith("/api/") || req.url?.startsWith("/fixture/")) {
        const outgoing = request(
          new URL(req.url, api),
          { method: req.method, headers: { ...req.headers, host: new URL(api!).host } },
          (incoming) => {
            if (req.url?.startsWith("/api/"))
              sent.push({
                trace: String(req.headers["sentry-trace"]),
                status: incoming.statusCode!,
              });
            res.writeHead(incoming.statusCode!, incoming.headers);
            incoming.pipe(res);
          },
        );
        outgoing.on("error", () => {
          res.writeHead(502);
          res.end();
        });
        req.pipe(outgoing);
        return;
      }
      const outgoing = request(
        api + (req.url?.includes("disabled") ? "/fixture/html-disabled" : "/fixture/html"),
        (incoming) => {
          res.writeHead(incoming.statusCode!, incoming.headers);
          incoming.pipe(res);
        },
      );
      outgoing.end();
    });
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      api = await ready;
      await build({
        configFile: false,
        root: resolve("apps/website"),
        logLevel: "error",
        plugins: [
          {
            name: "trace-fixture-bootstrap",
            enforce: "pre",
            resolveId(source, importer) {
              if (source === "./app/bootstrap.tsx" && importer?.endsWith("/src/main.tsx"))
                return resolve("packages/monitoring/src/trace-chain.fixture.ts");
            },
            transformIndexHtml: {
              order: "post",
              handler: () => [
                {
                  tag: "meta",
                  attrs: {
                    name: "sentry-trace",
                    content: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-1",
                  },
                  injectTo: "head",
                },
              ],
            },
          },
        ],
        build: { outDir: directory, emptyOutDir: true, minify: true },
      });
      const html = await readFile(join(directory, "index.html"), "utf8");
      expect(html).toMatch(
        /<script type="application\/json" id="opentickly-telemetry">\s*\{\s*\}\s*<\/script>/,
      );
      await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
      const address = server.address();
      if (!address || typeof address === "string") throw Error("missing browser server");
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      page.setDefaultTimeout(5000);
      await page.route("https://example.invalid/**", async (route) => {
        browserBodies.push(route.request().postData() ?? "");
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });
      await page.goto(`http://127.0.0.1:${address.port}`);
      await browserExpect(page.getByTestId("trace-chain")).toBeVisible();
      await page.evaluate("window.chain.concurrent()");
      await page.evaluate("window.chain.unsampled()");
      await page.waitForFunction("window.chain.pageloadEnded");
      await page.evaluate("window.chain.flush()");
      const bodies = (await fetch(api + "/fixture/envelopes").then((r) => r.json())) as string[];
      const transactions = bodies.flatMap((body) =>
        body.split("\n").flatMap((line) => {
          try {
            const event = JSON.parse(line);
            return event.type === "transaction" && event.contexts?.trace ? [event] : [];
          } catch {
            return [];
          }
        }),
      ) as {
        transaction: string;
        contexts: { trace: { trace_id: string; span_id: string; parent_span_id: string } };
        spans: {
          trace_id: string;
          span_id: string;
          parent_span_id: string;
          description: string;
          op: string;
          start_timestamp: string;
          timestamp: string;
        }[];
      }[];
      const spans = browserBodies.flatMap((body) =>
        body.split("\n").flatMap((line) => {
          try {
            const data = JSON.parse(line);
            return data.version === 2 &&
              Array.isArray(data.items) &&
              typeof data.items[0]?.is_segment === "boolean"
              ? (data as SerializedStreamedSpanContainer).items
              : [];
          } catch {
            return [];
          }
        }),
      );
      expect(sent).toHaveLength(4);
      expect(sent.every((r) => r.status === 200)).toBe(true);
      for (const [index, request] of sent.entries()) {
        const [trace, httpId, sampled] = request.trace.split("-");
        if (sampled === "0") {
          expect(transactions.some((t) => t.contexts.trace.trace_id === trace)).toBe(false);
          continue;
        }
        const http = spans.find((s) => s.trace_id === trace && s.span_id === httpId);
        expect(http?.name).toBe("project.list");
        const business = spans.find((s) => s.span_id === http?.parent_span_id);
        expect(business?.name).toBe("project.list");
        if (index === 0)
          expect(
            spans.find((s) => s.span_id === business?.parent_span_id)?.attributes["sentry.op"]
              ?.value,
          ).toBe("pageload");
        const transaction = transactions.find(
          (t) => t.contexts.trace.trace_id === trace && t.contexts.trace.parent_span_id === httpId,
        );
        expect(transaction?.transaction).toBe("project.list");
        const phase = transaction?.spans.find(
          (s) =>
            s.description === "project.list" &&
            s.parent_span_id === transaction.contexts.trace.span_id,
        );
        expect(phase?.op).toBe("task");
        const queries =
          transaction?.spans.filter(
            (s) => s.op === "db.query" && s.parent_span_id === phase?.span_id,
          ) ?? [];
        expect(queries.length).toBeGreaterThan(0);
        expect(
          queries.every(
            (q) =>
              q.timestamp !== q.start_timestamp &&
              Date.parse(q.timestamp) >= Date.parse(q.start_timestamp) &&
              q.trace_id === trace,
          ),
        ).toBe(true);
      }
      if (process.env.SENTRY_TEST_ARTIFACT_DIR) {
        await page.screenshot({
          path: join(process.env.SENTRY_TEST_ARTIFACT_DIR, "trace-opentickly-fix-browser.png"),
        });
        await writeFile(
          join(process.env.SENTRY_TEST_ARTIFACT_DIR, "trace-opentickly-fix-chain.json"),
          JSON.stringify(
            {
              requests: sent,
              browserSpans: spans.map((s) => ({
                name: s.name,
                trace: s.trace_id,
                span: s.span_id,
                parent: s.parent_span_id,
                op: s.attributes["sentry.op"]?.value,
              })),
              transactions,
              actualWebsiteHTML: true,
              actualMainEntrypoint: true,
              isolatedBootstrap: true,
            },
            null,
            2,
          ),
        );
      }
      const disabled = await browser.newPage();
      await disabled.goto(`http://127.0.0.1:${address.port}/?disabled`);
      await browserExpect(disabled.getByTestId("trace-chain")).toBeVisible();
      expect(await disabled.evaluate("window.chain.configured")).toBe(false);
      await disabled.close();
      expect(JSON.stringify(bodies)).not.toMatch(/select |smtp_|authorization|@example|api-token/i);
    } finally {
      await browser?.close();
      await new Promise<void>((done) => server.close(() => done()));
      if (api) await fetch(api + "/fixture/stop");
      else backend.kill("SIGTERM");
      const exitCode = await exited;
      await rm(directory, { recursive: true, force: true });
      expect(exitCode, output).toBe(0);
    }
  },
  90000,
);
