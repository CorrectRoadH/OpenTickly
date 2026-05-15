import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("AppSwitch geometry", () => {
  test("uses transform travel instead of separate left positions for checked alignment", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../../packages/web-ui/src/AppSwitch.tsx"),
      "utf8",
    );

    expect(source).toContain("left-[3px]");
    expect(source).toContain("top-1/2");
    expect(source).toContain("-translate-y-1/2");
    expect(source).toContain("data-[checked=true]:translate-x-[24px]");
    expect(source).not.toContain("data-[checked=true]:left-");
  });
});
