/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SummaryStat, ViewTab } from "./overview-views.tsx";

describe("overview header compaction", () => {
  it("uses the short list tab label", () => {
    render(<ViewTab currentView="calendar" onSelect={vi.fn()} targetView="list" />);

    expect(screen.getByRole("radio", { name: "List" })).toBeTruthy();
    expect(screen.queryByText("List view")).toBeNull();
  });

  it("can visually hide summary labels while keeping the value visible", () => {
    render(<SummaryStat hideLabel label="Week total" value="30:14:53 h" />);

    expect(screen.getByText("Week total").className).toContain("sr-only");
    expect(screen.getByText("30:14:53 h")).toBeTruthy();
  });
});
