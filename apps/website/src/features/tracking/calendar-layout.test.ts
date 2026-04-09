/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCalendarEventLayouts } from "./calendar-layout.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";

function makeEntry(
  overrides: Partial<GithubComTogglTogglApiInternalModelsTimeEntry> = {},
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: 1,
    start: "2026-04-09T14:00:00.000Z",
    stop: "2026-04-09T15:00:00.000Z",
    at: "2026-04-09T14:00:00.000Z",
    description: "test",
    ...overrides,
  } as GithubComTogglTogglApiInternalModelsTimeEntry;
}

describe("buildCalendarEventLayouts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("positions a 14:00 UTC entry at minute 840 regardless of i18n locale", async () => {
    // Simulate CJK locale — the bug: i18n.language = "zh" causes
    // Intl.DateTimeFormat to return "14时" instead of "14", yielding NaN.
    const i18nModule = await import("../../app/i18n.ts");
    await i18nModule.default.changeLanguage("zh");

    const entry = makeEntry({
      id: 100,
      start: "2026-04-09T14:00:00.000Z",
      stop: "2026-04-09T15:00:00.000Z",
    });

    const viewDate = new Date("2026-04-09T00:00:00.000Z");
    const nowMs = new Date("2026-04-09T14:30:00.000Z").getTime();

    const layouts = buildCalendarEventLayouts([entry], "UTC", nowMs, viewDate);
    const layout = layouts.get("100");

    expect(layout).toBeDefined();
    // 14:00 UTC = minute 840. The bug produces NaN.
    expect(layout!.top).toBe(840);
    expect(Number.isNaN(layout!.top)).toBe(false);
  });

  it("gives full width to two non-overlapping entries under CJK locale", async () => {
    const i18nModule = await import("../../app/i18n.ts");
    await i18nModule.default.changeLanguage("zh");

    const entryA = makeEntry({
      id: 1,
      start: "2026-04-09T10:00:00.000Z",
      stop: "2026-04-09T11:00:00.000Z",
    });
    const entryB = makeEntry({
      id: 2,
      start: "2026-04-09T11:00:00.000Z",
      stop: "2026-04-09T12:00:00.000Z",
    });

    const viewDate = new Date("2026-04-09T00:00:00.000Z");
    const nowMs = new Date("2026-04-09T12:30:00.000Z").getTime();

    const layouts = buildCalendarEventLayouts([entryA, entryB], "UTC", nowMs, viewDate);

    expect(layouts.get("1")!.width).toBe(100);
    expect(layouts.get("2")!.width).toBe(100);
    // Should be at different vertical positions
    expect(layouts.get("1")!.top).not.toBe(layouts.get("2")!.top);
  });
});
