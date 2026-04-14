import { describe, expect, it } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  stabilizeEntryGroups,
  stabilizeListViewProjects,
  stabilizeListViewTags,
  stabilizeTimeEntryList,
} from "./time-entry-stability.ts";

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

describe("stabilizeListViewProjects", () => {
  const makeProject = (
    overrides: Partial<{
      clientName?: string;
      color: string;
      id: number;
      name: string;
      pinned: boolean;
    }> = {},
  ) => ({
    clientName: undefined,
    color: "#ff0000",
    id: 1,
    name: "Core",
    pinned: false,
    ...overrides,
  });

  it("reuses the previous array when contents are equivalent even with fresh item refs", () => {
    const previous = [makeProject(), makeProject({ id: 2, name: "Ops" })];
    const next = previous.map((project) => ({ ...project }));

    const stabilized = stabilizeListViewProjects(previous, next);

    expect(stabilized).toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[1]).toBe(previous[1]);
  });

  it("reuses prior item references by id when only one project changed", () => {
    const previous = [makeProject(), makeProject({ id: 2, name: "Ops" })];
    const next = [{ ...previous[0]! }, { ...previous[1]!, name: "Operations" }];

    const stabilized = stabilizeListViewProjects(previous, next);

    expect(stabilized).not.toBe(previous);
    expect(stabilized[0]).toBe(previous[0]);
    expect(stabilized[1]).not.toBe(previous[1]);
  });
});

describe("stabilizeListViewTags", () => {
  it("reuses the previous array when items are reference-identical", () => {
    const previous = [
      { id: 1, name: "focus" },
      { id: 2, name: "admin" },
    ];
    const next = [...previous];

    expect(stabilizeListViewTags(previous, next)).toBe(previous);
  });

  it("returns the next array when items change", () => {
    const previous = [{ id: 1, name: "focus" }];
    const next = [{ id: 1, name: "deep focus" }];

    expect(stabilizeListViewTags(previous, next)).toBe(next);
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
