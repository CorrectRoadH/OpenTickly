import { describe, expect, it } from "vitest";

import { installMockWebApi, jsonResponse } from "../mock-web-api.ts";

describe("mock web api", () => {
  it("does not clobber a newer fetch mock when an older mock restores", async () => {
    const first = installMockWebApi([
      {
        path: "/web/v1/first",
        resolver: () => jsonResponse({ source: "first" }),
      },
    ]);
    const second = installMockWebApi([
      {
        path: "/web/v1/second",
        resolver: () => jsonResponse({ source: "second" }),
      },
    ]);

    first.restore();

    const response = await fetch("/web/v1/second");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: "second" });

    second.restore();
  });
});
