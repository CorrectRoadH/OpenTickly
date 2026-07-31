import { afterEach, describe, expect, it, vi } from "vitest";

import { sendTestEmailApi } from "./admin-client.ts";

const cloudflare502 = `<!DOCTYPE html>
<html class="no-js" lang="en-US"><head><title>opentoggl.com | 502: Bad gateway</title></head>
<body><h1>Bad gateway</h1></body></html>`;

function mockFetch(response: Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(response)),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch error bodies", () => {
  it("does not surface a proxy HTML error page as the error message", async () => {
    mockFetch(
      new Response(cloudflare502, {
        status: 502,
        statusText: "Bad Gateway",
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(sendTestEmailApi("admin@example.test")).rejects.toThrow(/^Bad Gateway$/);
  });

  it("keeps the JSON message from a structured error body", async () => {
    mockFetch(
      new Response(JSON.stringify({ message: "Email address required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(sendTestEmailApi("")).rejects.toThrow("Email address required");
  });

  it("returns the reported outcome for a failed delivery answered with 200", async () => {
    mockFetch(
      new Response(
        JSON.stringify({
          success: false,
          code: "tls_failed",
          message: "smtp tls smtp.example.test:465: handshake failure",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(sendTestEmailApi("admin@example.test")).resolves.toMatchObject({
      success: false,
      code: "tls_failed",
    });
  });
});
