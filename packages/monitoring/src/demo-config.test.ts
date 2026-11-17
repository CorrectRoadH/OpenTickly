import { afterEach, expect, it, vi } from "vite-plus/test";
import * as Sentry from "@sentry/react";
import { initDemoTelemetry } from "./browser.ts";

afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
  document.head.innerHTML = "";
  vi.unstubAllGlobals();
});
it("leaves unconfigured startup synchronous and performs no configuration fetch", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(initDemoTelemetry()).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  expect(Sentry.getClient()).toBeUndefined();
});
it("initializes from public HTML configuration before bootstrap requests", () => {
  document.head.innerHTML =
    '<script type="application/json" id="opentickly-telemetry">' +
    JSON.stringify({
      dsn: "https://public@example.invalid/1",
      environment: "production",
      release: "web@test",
    }) +
    "</script>";
  initDemoTelemetry();
  expect(Sentry.getClient()?.getOptions().parentSpanIsAlwaysRootSpan).toBe(false);
});
it("malformed inline configuration never blocks startup", () => {
  document.head.innerHTML = '<script type="application/json" id="opentickly-telemetry">{</script>';
  expect(() => initDemoTelemetry()).not.toThrow();
  expect(Sentry.getClient()).toBeUndefined();
});
