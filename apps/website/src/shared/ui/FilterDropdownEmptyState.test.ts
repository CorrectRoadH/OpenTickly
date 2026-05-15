import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("filter dropdown empty states", () => {
  test("do not infer pluralized empty messages from the visible label", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../../packages/web-ui/src/CheckboxFilterDropdown.tsx"),
      "utf8",
    );

    expect(source).toContain("emptyMessage");
    expect(source).not.toContain("No {label.toLowerCase()}s found");
    expect(source).not.toContain("{label.toLowerCase()}s");
  });
});
