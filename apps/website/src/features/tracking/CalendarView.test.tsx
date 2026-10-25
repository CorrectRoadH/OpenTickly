import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { CalendarView } from "./CalendarView.tsx";

describe("calendar slot selection lifecycle", () => {
  it("preserves the day column node when the start handler changes", () => {
    const props = {
      entries: [],
      timezone: "UTC",
      weekDays: [new Date()],
    };
    const oldStart = vi.fn();
    const newStart = vi.fn();
    const view = render(<CalendarView {...props} onStartEntry={oldStart} />);
    const column = view.container.querySelector(".rbc-day-slot");
    expect(column).not.toBeNull();
    view.rerender(<CalendarView {...props} onStartEntry={newStart} />);
    expect(view.container.querySelector(".rbc-day-slot")).toBe(column);
    fireEvent.click(view.getByTestId("current-time-indicator-play"));
    expect(oldStart).not.toHaveBeenCalled();
    expect(newStart).toHaveBeenCalledOnce();
  });
});
