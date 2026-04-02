import { describe, expect, it } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { stabilizeEntryGroups, stabilizeTimeEntryList } from "./time-entry-stability.ts";

function makeEntry(
  overrides: Partial<GithubComTogglTogglApiInternalModelsTimeEntry> = {},
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    billable: false,
    description: "Write tests",
    duration: 1800,
    id: 1,
    project_color: "#ff0000",
    project_id: 10,
    project_name: "Core",
    start: "2026-04-02T09:00:00Z",
    stop: "2026-04-02T09:30:00Z",
    tag_ids: [7],
    tags: ["focus"],
    workspace_id: 100,
    ...overrides,
  };
}

describe("stabilizeTimeEntryList", () => {
  it("reuses previous entry references when the list is semantically unchanged", () => {
    const previous = [makeEntry(), makeEntry({ description: "Review PR", id: 2 })];
    const next = previous.map((entry) => ({ ...entry, at: new Date().toISOString() }));

    const stabilized = stabilizeTimeEntryList(previous, next);

    expect(stabilized).toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[1]).toBe(previous[1]);
  });

  it("keeps unchanged rows stable when only one entry changes", () => {
    const previous = [makeEntry(), makeEntry({ description: "Review PR", id: 2 })];
    const next = [previous[0], { ...previous[1], description: "Review pull request" }];

    const stabilized = stabilizeTimeEntryList(previous, next);

    expect(stabilized).not.toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[1]).not.toBe(previous[1]);
  });
});

describe("stabilizeEntryGroups", () => {
  it("reuses previous group objects when nothing meaningful changed", () => {
    const previous = [
      {
        entries: [makeEntry()],
        key: "2026-04-02",
        totalSeconds: 1800,
      },
    ];
    const next = [
      {
        entries: [{ ...previous[0].entries[0], at: new Date().toISOString() }],
        key: "2026-04-02",
        totalSeconds: 1800,
      },
    ];

    const stabilized = stabilizeEntryGroups(previous, next);

    expect(stabilized).toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[0].entries[0]).toBe(previous[0].entries[0]);
  });

  it("preserves unchanged groups when another group changes", () => {
    const previous = [
      {
        entries: [makeEntry()],
        key: "2026-04-02",
        totalSeconds: 1800,
      },
      {
        entries: [makeEntry({ description: "Review PR", id: 2 })],
        key: "2026-04-01",
        totalSeconds: 1800,
      },
    ];
    const next = [
      previous[0],
      {
        entries: [{ ...previous[1].entries[0], description: "Review pull request" }],
        key: "2026-04-01",
        totalSeconds: 1800,
      },
    ];

    const stabilized = stabilizeEntryGroups(previous, next);

    expect(stabilized).not.toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[1]).not.toBe(previous[1]);
    expect(stabilized[1].entries[0]).not.toBe(previous[1].entries[0]);
  });
});
