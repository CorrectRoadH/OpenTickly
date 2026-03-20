import { describe, expect, it } from "vitest";

import { createSampleQuotaGoldenCase, runGoldenCase } from "../../src/testing/golden.ts";

describe("compat golden harness", () => {
  it("keeps the sample quota payload stable", () => {
    const result = runGoldenCase(createSampleQuotaGoldenCase());

    expect(result.ok).toBe(true);
    expect(result.source).toBe("toggl-track-api-v9.swagger.json");
    expect(result.method).toBe("get");
    expect(result.path).toBe("/me/quota");
  });
});
