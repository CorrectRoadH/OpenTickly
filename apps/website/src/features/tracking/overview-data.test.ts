import { describe, expect, it } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { splitAtMidnight } from "./calendar-types.ts";
import { buildEntryGroups, formatEntryRange } from "./overview-data.ts";

/**
 * Entry 2371 shape from toggl CLI: start 2026-04-13 22:48:22 local,
 * stop exactly 2026-04-14 00:00:00 local. Such an entry must group under
 * its START date (2026-04-13), and its time-range label must render the
 * end as "00:00" — NOT collapse to the next day or display "running".
 */
describe("time entry ending exactly at next-day midnight", () => {
  const timezone = "UTC";

  const entry: GithubComTogglTogglApiInternalModelsTimeEntry = {
    id: 2371,
    description: "tob的本质",
    start: "2026-04-13T22:48:22Z",
    stop: "2026-04-14T00:00:00Z",
    duration: 4298,
    billable: false,
    workspace_id: 1,
    tags: [],
    project_id: null,
  };

  it("groups under the start date, not the stop date", () => {
    const groups = buildEntryGroups([entry], timezone);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-04-13");
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0].id).toBe(2371);
  });

  it("formatEntryRange shows '22:48 – 00:00' in 24-hour format", () => {
    const range = formatEntryRange(entry, timezone, "HH:mm");
    expect(range).toBe("22:48 \u2013 00:00");
  });

  /**
   * Regression: an entry ending exactly at next-day 00:00 must NOT produce a
   * segment that straddles the day boundary. react-big-calendar promotes any
   * event whose `end` lands on a different calendar day into the all-day row
   * (or drops it from the time grid entirely), which is why entry 2371
   * disappeared from the calendar. splitAtMidnight must clip the tail to
   * `midnight - 1ms` so the segment stays in the start day's time grid —
   * the same clipping the cross-day (else) branch already applies.
   */
  it("splitAtMidnight keeps an entry ending exactly at next-day midnight in the start day", () => {
    const start = new Date(2026, 3, 13, 22, 48, 22); // local 2026-04-13 22:48:22
    const end = new Date(2026, 3, 14, 0, 0, 0, 0); // local 2026-04-14 00:00:00.000

    const segments = splitAtMidnight(start, end);

    expect(segments).toHaveLength(1);
    // The segment must end on the SAME calendar day it started, otherwise
    // react-big-calendar renders it as an all-day event.
    expect(segments[0].start.getDate()).toBe(13);
    expect(segments[0].end.getDate()).toBe(13);
    // Tail clipped to 23:59:59.999 of the start day (midnight - 1 ms).
    expect(segments[0].end.getTime()).toBe(end.getTime() - 1);
  });
});
