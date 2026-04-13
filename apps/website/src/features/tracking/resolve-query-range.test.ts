import { describe, expect, it } from "vitest";

import { resolveTimeEntryQueryRange } from "./resolve-query-range.ts";

const weekRange = { startDate: "2026-04-13", endDate: "2026-04-19" }; // Mon..Sun

describe("resolveTimeEntryQueryRange", () => {
  it("returns weekRange when rangeMode=week and view=calendar", () => {
    const range = resolveTimeEntryQueryRange({
      rangeMode: "week",
      view: "calendar",
      listDateRange: null,
      weekRange,
      daysLoaded: 9,
      today: new Date("2026-04-13T10:00:00Z"),
    });
    expect(range).toEqual(weekRange);
  });

  it("returns rolling [today-N, today+1] when rangeMode=rolling, even on Monday", () => {
    // Today is Monday 2026-04-13. Bug: weekRange would start on Monday and exclude prior days.
    const range = resolveTimeEntryQueryRange({
      rangeMode: "rolling",
      view: "calendar",
      listDateRange: null,
      weekRange,
      daysLoaded: 9,
      today: new Date(2026, 3, 13, 10, 0, 0), // local Monday
    });
    // start should be today - 9 days = 2026-04-04 (Saturday of prior week).
    expect(range.startDate).toBe("2026-04-04");
    expect(range.endDate).toBe("2026-04-14");
  });

  it("respects an explicit listDateRange regardless of rangeMode", () => {
    const explicit = { startDate: "2026-01-01", endDate: "2026-01-31" };
    expect(
      resolveTimeEntryQueryRange({
        rangeMode: "rolling",
        view: "list",
        listDateRange: explicit,
        weekRange,
        daysLoaded: 9,
        today: new Date(2026, 3, 13),
      }),
    ).toEqual(explicit);
  });

  it("uses rolling range when view=list and rangeMode=week (backward compat)", () => {
    const range = resolveTimeEntryQueryRange({
      rangeMode: "week",
      view: "list",
      listDateRange: null,
      weekRange,
      daysLoaded: 9,
      today: new Date(2026, 3, 13),
    });
    expect(range.startDate).toBe("2026-04-04");
    expect(range.endDate).toBe("2026-04-14");
  });
});
