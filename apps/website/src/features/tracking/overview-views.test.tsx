import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { CalendarView } from "./overview-views.tsx";

describe("CalendarView", () => {
  it("renders running entries with project color and diagonal stripes", () => {
    render(
      <CalendarView
        entries={[
          createTimeEntryFixture({
            description: "记录思考/rethink",
            duration: -120,
            project_color: "#c6b23f",
            project_name: "记录思考/rethink",
            start: "2026-03-23T09:30:00Z",
            stop: undefined,
          }),
        ]}
        hours={[9]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const entryCard = screen.getByRole("button", { name: "Edit 记录思考/rethink" });

    expect(entryCard.style.borderBottomColor).toBe("rgb(198, 178, 63)");
    expect(entryCard.style.backgroundImage).toContain("repeating-linear-gradient");
  });

  it("renders the pink current-time line on the current day", () => {
    render(
      <CalendarView
        entries={[]}
        hours={[10]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const nowLine = screen.getByTestId("calendar-now-line");

    expect(nowLine).toBeTruthy();
  });
});

function buildWeek(startIso: string): Date[] {
  const start = new Date(startIso);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

function createTimeEntryFixture(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    description: "Fixture entry",
    duration: 1800,
    id: 12,
    project_color: "#c67abc",
    project_id: 44,
    project_name: "Waste time",
    start: "2026-03-23T10:00:00Z",
    stop: "2026-03-23T10:30:00Z",
    workspace_id: 202,
    ...overrides,
  };
}
