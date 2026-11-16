import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as Sentry from "@sentry/react";

afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
function officialHost() {
  vi.stubGlobal("window", { ...window, location: new URL("https://selfhosted.example/") });
}
describe("demo runtime config", () => {
  it("enables an operator DSN on any host with optional environment and release", async () => {
    officialHost();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              sentry: { dsn: "https://public@example.com/1", environment: "", release: "" },
            }),
          ),
      ),
    );
    const { initDemoTelemetry } = await import("./browser.ts");
    await initDemoTelemetry();
    expect(Sentry.getClient()?.getOptions().dsn).toBe("https://public@example.com/1");
    expect(Sentry.getClient()?.getOptions().environment).toBe("production");
  });
  it("uses the exact anonymous contract once, leaving empty config disabled", async () => {
    officialHost();
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ sentry: { dsn: "", environment: "", release: "" } })),
    );
    vi.stubGlobal("fetch", fetch);
    const { initDemoTelemetry } = await import("./browser.ts");
    await initDemoTelemetry();
    await initDemoTelemetry();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/web/v1/telemetry/config",
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(Sentry.getClient()).toBeUndefined();
  });
  it("keeps rendering independent and aborts pending config after two seconds", async () => {
    officialHost();
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }),
    );
    const { initDemoTelemetry } = await import("./browser.ts");
    const pending = initDemoTelemetry();
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(Sentry.getClient()).toBeUndefined();
  });
  it("disables monitoring on HTTP and JSON failures", async () => {
    officialHost();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("broken", { status: 503 })),
    );
    const { initDemoTelemetry } = await import("./browser.ts");
    await expect(initDemoTelemetry()).resolves.toBeUndefined();
    expect(Sentry.getClient()).toBeUndefined();
  });
});
