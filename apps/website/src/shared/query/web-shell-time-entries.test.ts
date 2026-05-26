import { describe, expect, it } from "vitest";

import { timeEntriesQueryKey } from "./web-shell-time-entries.ts";

describe("timeEntriesQueryKey", () => {
  it("scopes time entry lists by workspace", () => {
    expect(timeEntriesQueryKey(1, "2026-05-01", "2026-05-07", false)).not.toEqual(
      timeEntriesQueryKey(2, "2026-05-01", "2026-05-07", false),
    );
  });
});
