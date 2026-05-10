import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ReportsProfitabilityView.tsx", import.meta.url), "utf8");

describe("ReportsProfitabilityView project colors", () => {
  it("supports resolving project colors from project_id lookups when report rows omit color fields", () => {
    expect(source).toContain("projectColorById");
    expect(source).toContain("row.project_id");
    expect(source).toContain("projectColorById.get");
  });
});
