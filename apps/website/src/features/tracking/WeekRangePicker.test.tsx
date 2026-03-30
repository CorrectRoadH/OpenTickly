/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WeekRangePicker } from "./WeekRangePicker.tsx";

afterEach(cleanup);

describe("WeekRangePicker mode=range", () => {
  function openPicker() {
    const trigger = screen.getByRole("button", { name: /Press Enter to open date picker/i });
    fireEvent.click(trigger);
    return screen.getByTestId("week-range-dialog");
  }

  function findDay(dateStr: string): HTMLElement {
    return screen.getByLabelText(`Select ${dateStr}`);
  }

  it("first click selects start date, second click selects end date and closes", () => {
    const onSelectRange = vi.fn();
    render(
      <WeekRangePicker
        label="Select range"
        mode="range"
        onNext={() => {}}
        onPrev={() => {}}
        onSelectDate={() => {}}
        onSelectRange={onSelectRange}
        selectedDate={new Date(2026, 2, 15)}
      />,
    );

    openPicker();
    // First click — select start (March 10)
    fireEvent.click(findDay("2026-03-10"));
    // Picker should stay open
    expect(screen.queryByTestId("week-range-dialog")).not.toBeNull();

    // Second click — select end (March 20)
    fireEvent.click(findDay("2026-03-20"));
    // Should call onSelectRange with start and end
    expect(onSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = onSelectRange.mock.calls[0];
    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(20);
    expect(start.getMonth()).toBe(2); // March
    expect(end.getMonth()).toBe(2);
  });

  it("allows end date before start date — swaps automatically", () => {
    const onSelectRange = vi.fn();
    render(
      <WeekRangePicker
        label="Select range"
        mode="range"
        onNext={() => {}}
        onPrev={() => {}}
        onSelectDate={() => {}}
        onSelectRange={onSelectRange}
        selectedDate={new Date(2026, 2, 15)}
      />,
    );

    openPicker();
    fireEvent.click(findDay("2026-03-25"));
    fireEvent.click(findDay("2026-03-05"));

    expect(onSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = onSelectRange.mock.calls[0];
    // Should auto-swap so start < end
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(5);
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(25);
  });

  it("supports cross-month range by navigating months between clicks", () => {
    const onSelectRange = vi.fn();
    render(
      <WeekRangePicker
        label="Select range"
        mode="range"
        onNext={() => {}}
        onPrev={() => {}}
        onSelectDate={() => {}}
        onSelectRange={onSelectRange}
        selectedDate={new Date(2026, 2, 15)}
      />,
    );

    openPicker();
    // Click March 25 as start
    fireEvent.click(findDay("2026-03-25"));

    // Navigate to April
    const nextMonthBtn = screen.getByRole("button", { name: "Next month" });
    fireEvent.click(nextMonthBtn);

    // Click April 10 as end
    fireEvent.click(findDay("2026-04-10"));

    expect(onSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = onSelectRange.mock.calls[0];
    expect(start.getMonth()).toBe(2); // March
    expect(start.getDate()).toBe(25);
    expect(end.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(10);
  });

  it("highlights days in the selected range between start and pending end", () => {
    render(
      <WeekRangePicker
        label="Select range"
        mode="range"
        onNext={() => {}}
        onPrev={() => {}}
        onSelectDate={() => {}}
        onSelectRange={() => {}}
        selectedDate={new Date(2026, 2, 15)}
      />,
    );

    openPicker();
    // Click start date
    fireEvent.click(findDay("2026-03-10"));

    // Hover over day 15 to simulate pending end
    fireEvent.mouseEnter(findDay("2026-03-15"));

    // Days 10-15 should have range highlight
    const day12 = findDay("2026-03-12");
    expect(day12.className).toContain("range-mid");
  });

  it("highlights the confirmed range via rangeStart/rangeEnd props", () => {
    render(
      <WeekRangePicker
        label="Select range"
        mode="range"
        onNext={() => {}}
        onPrev={() => {}}
        onSelectDate={() => {}}
        onSelectRange={() => {}}
        rangeStart={new Date(2026, 2, 10)}
        rangeEnd={new Date(2026, 2, 20)}
        selectedDate={new Date(2026, 2, 15)}
      />,
    );

    openPicker();
    const day15 = findDay("2026-03-15");
    expect(day15.className).toContain("range-mid");

    const day10 = findDay("2026-03-10");
    expect(day10.className).toContain("range-start");

    const day20 = findDay("2026-03-20");
    expect(day20.className).toContain("range-end");
  });
});
