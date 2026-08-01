import { describe, expect, it } from "vitest";

import { buildLlmsSummary } from "./llms-summary";

describe("LLM summary", () => {
  it("uses the repository's AGPL-3.0 license", () => {
    expect(buildLlmsSummary("en")).toContain("License: AGPL-3.0");
  });
});
