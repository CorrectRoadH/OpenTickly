import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./SettingsActivity.tsx", import.meta.url), "utf8");

describe("SettingsActivity user name mapping", () => {
  it("maps activity user ids through workspace members, most-active users, and session fallback before placeholder text", () => {
    expect(source).toContain("m.user_id ?? m.id");
    expect(source).toContain("session.user.id");
    expect(source).toContain("session.user.fullName");
    expect(source).toContain("m.fullname || m.email");
    expect(source).not.toContain("lookup.set(m.id, m.name)");
  });
});
