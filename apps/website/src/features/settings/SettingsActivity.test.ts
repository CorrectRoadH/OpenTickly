import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./SettingsActivity.tsx", import.meta.url), "utf8");

describe("SettingsActivity user name mapping", () => {
  it("maps activity user ids through workspace member user_id before falling back to member id", () => {
    expect(source).toContain("m.user_id ?? m.id");
    expect(source).not.toContain("lookup.set(m.id, m.name)");
  });
});
