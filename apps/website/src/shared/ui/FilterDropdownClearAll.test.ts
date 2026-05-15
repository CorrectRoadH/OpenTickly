import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("filter dropdown clear action", () => {
  test("keeps the clear action mounted so option rows do not shift after selection", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../../packages/web-ui/src/CheckboxFilterDropdown.tsx"),
      "utf8",
    );

    expect(source).toContain("disabled={activeCount === 0}");
    expect(source).not.toContain("{activeCount > 0 ? (\n            <div");
  });
});
