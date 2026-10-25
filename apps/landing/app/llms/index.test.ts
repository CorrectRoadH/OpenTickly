import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("../lib/source", () => ({ source: {} }));
vi.mock("../lib/i18n", () => ({ i18n: { languages: ["en"], defaultLanguage: "en" } }));
vi.mock("../lib/llms-summary", () => ({ buildLlmsSummary: () => "Product summary\n" }));
vi.mock("fumadocs-core/source", () => ({
  llms: () => ({ index: async () => "# Documentation\n- [Timer](/docs/timer)\n" }),
}));

import { loader } from "./index";

describe("llms.txt loader", () => {
  it("includes the resolved documentation index", async () => {
    const response = await loader({
      request: new Request("https://example.com/llms.txt"),
    } as Parameters<typeof loader>[0]);

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe(
      "Product summary\n# Documentation\n- [Timer](/docs/timer)\n",
    );
  });
});
