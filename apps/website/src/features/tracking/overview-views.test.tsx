import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const entryCard = screen.getByRole("button", { name: "Edit 记录思考/rethink" });

    expect(entryCard.style.backgroundColor).toBe("rgb(198, 178, 63)");
    expect(entryCard.style.backgroundImage).toContain("repeating-linear-gradient");
    expect(entryCard.style.borderBottomWidth).toBe("");
    expect(entryCard.style.borderBottomColor).toBe("");
    expect(entryCard.className).toContain("left-px");
    expect(entryCard.className).toContain("right-px");
    expect(entryCard.className).toContain("rounded-[6px]");
  });

  it("renders the pink current-time line on the current day", () => {
    render(
      <CalendarView
        entries={[]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const nowLine = screen.getByTestId("calendar-now-line");
    const nowLineDot = screen.getByTestId("calendar-now-line-dot");

    expect(nowLine).toBeTruthy();
    expect(nowLineDot.className).toContain("size-4");
  });

  it("renders time entry with all fields: description, project, client, duration, and tag", () => {
    render(
      <CalendarView
        entries={[
          createTimeEntryFixture({
            client_name: "Test Client",
            description: "Test description",
            duration: 3600,
            project_color: "#c67abc",
            project_name: "Test Project",
            start: "2026-03-23T10:00:00Z",
            stop: "2026-03-23T11:00:00Z",
            tags: ["Test Tag"],
          }),
        ]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const entryCard = screen.getByRole("button", { name: "Edit Test description" });
    expect(entryCard).toBeTruthy();

    expect(entryCard).toHaveTextContent("Test description");
    expect(entryCard).toHaveTextContent("Test Project • Test Client");
    expect(entryCard).toHaveTextContent("01:00:00");
    expect(entryCard).toHaveTextContent("Test Tag");
  });

  it("renders sticky calendar chrome without an all-day row and allows header drill-down selection", () => {
    render(
      <CalendarView
        entries={[]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        onSelectSlot={vi.fn()}
        onSelectSubviewDate={vi.fn()}
        selectedSubviewDateIso="2026-03-23"
        subview="week"
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    const calendarRoot = screen.getByTestId("timer-calendar-view");
    const stickyHeader = screen.getByTestId("calendar-sticky-header");
    const dayButton = screen.getByRole("button", { name: "Open day view for Monday 23" });

    expect(calendarRoot).toBeTruthy();
    expect(stickyHeader.className).toContain("sticky");
    expect(screen.queryByTestId("calendar-all-day-row")).toBeNull();
    expect(screen.getByTestId("calendar-subview-controls")).toBeTruthy();
    expect(dayButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens calendar entry affordances for stopped entries but not running entries", () => {
    render(
      <CalendarView
        entries={[
          createTimeEntryFixture({
            description: "Stopped block",
            id: 21,
          }),
          createTimeEntryFixture({
            description: "Running block",
            duration: -120,
            id: 22,
            start: "2026-03-24T11:00:00Z",
            stop: undefined,
          }),
        ]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Stopped block" }));

    expect(screen.getByRole("button", { name: "Move entry Stopped block" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resize start for Stopped block" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resize end for Stopped block" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entry actions for Stopped block" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Running block" }));

    expect(screen.queryByRole("button", { name: "Resize end for Running block" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move entry Running block" })).toBeNull();
    expect(screen.getByRole("button", { name: "Entry actions for Running block" })).toBeTruthy();
  });

  it("supports empty-slot selection and direct-manipulation callbacks", () => {
    const onSelectSlot = vi.fn();
    const onMoveEntry = vi.fn();
    const onResizeEntry = vi.fn();

    render(
      <CalendarView
        entries={[
          createTimeEntryFixture({
            description: "Movable block",
            id: 33,
          }),
        ]}
        nowMs={Date.parse("2026-03-23T10:15:00Z")}
        onMoveEntry={onMoveEntry}
        onResizeEntry={onResizeEntry}
        onSelectSlot={onSelectSlot}
        timezone="UTC"
        weekDays={buildWeek("2026-03-23T00:00:00Z")}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Select time range on Monday 23 at 01:00" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Move entry Movable block" }));
    fireEvent.click(screen.getByRole("button", { name: "Resize start for Movable block" }));
    fireEvent.click(screen.getByRole("button", { name: "Resize end for Movable block" }));

    expect(onSelectSlot).toHaveBeenCalledWith({
      dayIso: "2026-03-23",
      minute: 60,
    });
    expect(onMoveEntry).toHaveBeenCalledWith(33, 15);
    expect(onResizeEntry).toHaveBeenNthCalledWith(1, 33, "start", -15);
    expect(onResizeEntry).toHaveBeenNthCalledWith(2, 33, "end", 15);
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
