import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("web-contract module", () => {
  it("keeps wave-1 DTO shapes sourced from generated contracts", () => {
    const filePath = resolve(import.meta.dirname, "../web-contract.ts");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("@opentoggl/shared-contracts");
    expect(source).not.toMatch(/export type \w+\s*=\s*\{/);
  });
});
