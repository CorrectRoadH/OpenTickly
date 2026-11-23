// @vitest-environment node
import { expect, it } from "vite-plus/test";
import { build } from "vite";
import { createServer } from "node:http";
import { realpathSync } from "node:fs";
import { createRequire, SourceMap } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ErrorEvent, SerializedStreamedSpanContainer } from "@sentry/core";

it("runs the actual update Worker in workerd with local HTTP upstream and ingestion", async () => {
  const require = createRequire(
    realpathSync(resolve("apps/update-worker/node_modules/wrangler/package.json")),
  );
  const {
    Miniflare,
    convertV4MiniflareOptions,
    Response: LocalResponse,
  } = await import(require.resolve("miniflare"));
  const directory = await mkdtemp(join(tmpdir(), "ot-worker-trace-"));
  const debugId = "12345678-1234-4321-9876-123456789abc";
  const bodies: string[] = [];
  const upstream: string[] = [];
  let githubStatus = 200;
  const receiver = createServer((req, res) => {
    let body = "";
    req.on("data", (part) => {
      body += String(part);
    });
    req.on("end", () => {
      if (req.url === "/github") {
        upstream.push(JSON.stringify(req.headers));
        res.statusCode = githubStatus;
        res.setHeader("Content-Type", "application/json");
        res.end("[]");
      } else {
        bodies.push(body);
        res.end("{}");
      }
    });
  });
  await new Promise<void>((done) => receiver.listen(0, "127.0.0.1", done));
  const address = receiver.address();
  if (!address || typeof address === "string") throw Error("missing receiver");
  const origin = `http://127.0.0.1:${address.port}`;
  let runtime:
    | {
        dispatchFetch: (url: string, init?: RequestInit) => Promise<Response>;
        dispose: () => Promise<void>;
      }
    | undefined;
  try {
    await build({
      configFile: false,
      logLevel: "error",
      define: { __SENTRY_UPDATE_PRODUCTION__: "false" },
      build: {
        ssr: resolve("apps/update-worker/test/runtime.fixture.ts"),
        outDir: directory,
        emptyOutDir: true,
        minify: false,
        sourcemap: true,
        rollupOptions: {
          external: [/^node:/, /^cloudflare:/],
          output: {
            entryFileNames: "worker.js",
            banner: `globalThis._sentryDebugIds = { [new Error().stack]: "${debugId}" };`,
          },
        },
      },
      ssr: { noExternal: true },
    });
    runtime = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: await readFile(join(directory, "worker.js"), "utf8"),
        compatibilityDate: "2025-04-01",
        compatibilityFlags: ["nodejs_compat"],
        bindings: {
          GITHUB_REPO: "test/repo",
          SENTRY_RELEASE: "update@fixture",
          SENTRY_ENVIRONMENT: "production",
        },
        cf: false,
        outboundService: async (request: Request) => {
          const target = new URL(request.url);
          const response = await fetch(
            origin + (target.hostname === "api.github.com" ? "/github" : "/ingest"),
            {
              method: request.method,
              headers: request.headers,
              body:
                request.method === "GET" || request.method === "HEAD"
                  ? undefined
                  : await request.text(),
            },
          );
          return new LocalResponse(await response.text(), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        },
      }),
    );
    const sampled = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const unsampled = "cccccccccccccccccccccccccccccccc";
    const noDecision = "dddddddddddddddddddddddddddddddd";
    const outcomes = await Promise.all([
      runtime!.dispatchFetch("https://update.example/", {
        headers: {
          "sentry-trace": sampled + "-bbbbbbbbbbbbbbbb-1",
          baggage: "sentry-transaction=SENSITIVE,other=SENSITIVE",
        },
      }),
      runtime!.dispatchFetch("https://update.example/missing", {
        headers: { "sentry-trace": noDecision + "-bbbbbbbbbbbbbbbb" },
      }),
      runtime!.dispatchFetch("https://update.example/", {
        method: "POST",
        headers: { "sentry-trace": sampled + "-eeeeeeeeeeeeeeee-1" },
        body: "SENSITIVE",
      }),
      runtime!.dispatchFetch("https://update.example/fixture/failure", {
        headers: { "sentry-trace": sampled + "-ffffffffffffffff-1" },
      }),
      runtime!.dispatchFetch("https://update.example/", {
        headers: { "sentry-trace": unsampled + "-bbbbbbbbbbbbbbbb-0" },
      }),
      runtime!.dispatchFetch("https://update.example/", {
        method: "HEAD",
        headers: { "sentry-trace": sampled + "-1111111111111111-1" },
      }),
      runtime!.dispatchFetch("https://update.example/", {
        method: "OPTIONS",
        headers: { "sentry-trace": sampled + "-2222222222222222-1" },
      }),
    ]);
    expect(outcomes.map((r) => r.status)).toEqual([200, 404, 405, 503, 200, 405, 204]);
    await Promise.all(outcomes.map((r) => r.text()));
    // A response body finishing does not mean the request's waitUntil transport
    // has reached ingestion. Observe real receiver state before disposing workerd.
    const received = () =>
      bodies.flatMap((body) =>
        body.split("\n").flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        }),
      );
    await expect
      .poll(() => {
        const items = received().flatMap((data) => (data.version === 2 ? data.items : []));
        return {
          roots: items.filter(
            (item) => typeof item.is_segment === "boolean" && item.name === "update.request",
          ).length,
          counts: items.filter((item) => item.name === "app.operation.count").length,
        };
      })
      .toEqual({ roots: 6, counts: 7 });
    const containers = received();
    const spans = containers.flatMap((data) =>
      data.version === 2 && typeof data.items?.[0]?.is_segment === "boolean"
        ? (data as SerializedStreamedSpanContainer).items
        : [],
    );
    const roots = spans.filter((s) => s.name === "update.request");
    expect(roots).toHaveLength(6);
    expect(roots.every((s) => s.attributes["sentry.op"]?.value === "http.server")).toBe(true);
    expect(
      roots.some((s) => s.trace_id === noDecision && s.parent_span_id === "bbbbbbbbbbbbbbbb"),
    ).toBe(true);
    expect(
      spans
        .filter((s) => s.trace_id === unsampled)
        .map((s) => ({
          name: s.name,
          parent: s.parent_span_id,
          op: s.attributes["sentry.op"]?.value,
        })),
    ).toEqual([]);
    expect(
      roots.find((s) => s.parent_span_id === "ffffffffffffffff")?.attributes.outcome?.value,
    ).toBe("error");
    expect(
      roots.find((s) => s.parent_span_id === "eeeeeeeeeeeeeeee")?.attributes.outcome?.value,
    ).toBe("rejected");
    expect(
      spans
        .filter((s) => s.name === "update.upstream.fetch")
        .every((s) => s.attributes["sentry.op"]?.value === "http.client"),
    ).toBe(true);
    const metrics = containers.flatMap((data) =>
      data.version === 2 && data.items?.[0]?.name ? data.items : [],
    );
    expect(metrics.filter((m) => m.name === "app.operation.count")).toHaveLength(7);
    expect(upstream).toHaveLength(2);
    expect(upstream.join(" ")).not.toMatch(/sentry-trace|baggage/);
    expect(bodies.join(" ")).not.toContain("SENSITIVE");

    githubStatus = 503;
    const fallback = await runtime!.dispatchFetch("https://update.example/");
    expect(fallback.status).toBe(200);
    expect(await fallback.json()).toMatchObject({ latestVersion: "", updateAvailable: false });
    const updateError = (route: string): ErrorEvent | undefined =>
      received().find(
        (data: ErrorEvent) =>
          data.tags?.component === "update" &&
          data.tags?.route === route &&
          data.tags?.["http.status_code"] === "200",
      );
    await expect.poll(() => updateError("/")).toBeDefined();
    const event = updateError("/");
    const exceptions = event?.exception?.values;
    expect(exceptions).toMatchObject([{ type: "Error", value: "github: 503 Service Unavailable" }]);
    const frame = exceptions?.[0]?.stacktrace?.frames?.at(-1);
    expect(frame?.function).toBe("fetchReleases");
    expect(event?.debug_meta?.images ?? []).toContainEqual({
      type: "sourcemap",
      code_file: frame?.abs_path,
      debug_id: debugId,
    });
    const map = new SourceMap(JSON.parse(await readFile(join(directory, "worker.js.map"), "utf8")));
    const originFrame = map.findEntry((frame?.lineno ?? 1) - 1, (frame?.colno ?? 1) - 1);
    expect("originalSource" in originFrame ? originFrame.originalSource : undefined).toContain(
      "/apps/update-worker/src/github.ts",
    );

    const chained = await runtime!.dispatchFetch("https://update.example/fixture/error-chain");
    expect(await chained.text()).toBe("fallback");
    await expect.poll(() => updateError("unmatched")).toBeDefined();
    expect(updateError("unmatched")?.exception?.values).toMatchObject([
      {
        type: "SyntaxError",
        value: "Malformed release: Bearer [Filtered]",
        mechanism: { source: "cause", parent_id: 0 },
      },
      {
        type: "TypeError",
        value: "Could not read the update manifest",
        stacktrace: {
          frames: expect.arrayContaining([
            expect.objectContaining({ function: "throwManifestError" }),
          ]),
        },
      },
    ]);
    expect(bodies.join(" ")).not.toContain("SENSITIVE");
  } finally {
    await runtime?.dispose().catch(() => {});
    await new Promise<void>((done) => receiver.close(() => done()));
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
