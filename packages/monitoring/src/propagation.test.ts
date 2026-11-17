import { describe, expect, it, vi } from "vite-plus/test";
import { browserTargets, installFetchGuard } from "./propagation.ts";

describe("browser propagation boundary", () => {
  it("matches parsed exact origin/path and never landing", () => {
    const allowed = browserTargets("web", "https://self.example");
    for (const path of [
      "/web/v1",
      "/web/v1/session",
      "/auth/sso/resolve",
      "/webhooks/api/v1/x",
      "/api/v9/desktop_login_tokens",
    ])
      expect(allowed.some((r) => r.test(`https://self.example${path}`))).toBe(true);
    for (const url of [
      "https://self.example.evil/web/v1/a",
      "https://u@self.example/web/v1/a",
      "https://self.example/web/v11",
      "https://self.example/api/v9/desktop_login",
      "https://self.example/api/v9/desktop_login?token=ignored",
      "https://self.example/web/v1/%2e%2e/else",
      "https://self.example/auth/sso/resolve/a",
    ])
      expect(allowed.some((r) => r.test(url))).toBe(false);
    expect(browserTargets("landing", "https://self.example")).toEqual([]);
  });
  it("guards effective Request redirect without replacing input, body, or signal", async () => {
    const send = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok"),
    );
    const host = { fetch: send as typeof fetch };
    installFetchGuard(host, browserTargets("web", "https://self.example"), "https://self.example");
    const input = new Request("https://self.example/web/v1/session", {
      method: "POST",
      body: "body",
      redirect: "manual",
    });
    await host.fetch(input);
    expect(send.mock.calls[0]?.[0]).toBe(input);
    expect(send.mock.calls[0]?.[1]?.redirect).toBe("manual");
    const signal = new AbortController().signal;
    await host.fetch(input, { redirect: "follow", signal });
    expect(send.mock.calls[1]?.[1]).toMatchObject({ redirect: "error", signal });
    await host.fetch("https://other.example/web/v1/a");
    expect(send.mock.calls[2]?.[1]).toBeUndefined();
    expect(input.bodyUsed).toBe(false);
  });
});
