import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RadioFilterDropdown } from "./RadioFilterDropdown.tsx";

const OPTIONS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

function openDropdown() {
  fireEvent.click(screen.getByTestId("filter-status"));
}

describe("RadioFilterDropdown", () => {
  it("renders every option once opened", () => {
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={vi.fn()}
        options={OPTIONS}
        selected="all"
        testId="filter-status"
      />,
    );

    openDropdown();

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archived" })).toBeInTheDocument();
  });

  it("calls onChange with the clicked option key and closes the panel", () => {
    const onChange = vi.fn();
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={onChange}
        options={OPTIONS}
        selected="all"
        testId="filter-status"
      />,
    );

    openDropdown();
    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("active");
    expect(screen.queryByRole("button", { name: "Archived" })).not.toBeInTheDocument();
  });

  it("shows the default option label when selection matches the default", () => {
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={vi.fn()}
        options={OPTIONS}
        selected="all"
        testId="filter-status"
      />,
    );

    expect(screen.getByTestId("filter-status")).toHaveTextContent("Status");
  });

  it("shows the selected option label and a clear affordance once a non-default option is active", () => {
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={vi.fn()}
        options={OPTIONS}
        selected="active"
        testId="filter-status"
      />,
    );

    const trigger = screen.getByTestId("filter-status");
    expect(trigger).toHaveTextContent("Active");
    expect(trigger.querySelector('[role="button"]')).toBeInTheDocument();
  });

  it("does not render a clear affordance while on the default option", () => {
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={vi.fn()}
        options={OPTIONS}
        selected="all"
        testId="filter-status"
      />,
    );

    expect(
      screen.getByTestId("filter-status").querySelector('[role="button"]'),
    ).not.toBeInTheDocument();
  });

  it("calls onChange with the default option key when the clear affordance is clicked", () => {
    const onChange = vi.fn();
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={onChange}
        options={OPTIONS}
        selected="active"
        testId="filter-status"
      />,
    );

    const clearIcon = screen.getByTestId("filter-status").querySelector('[role="button"]')!;
    fireEvent.click(clearIcon);

    expect(onChange).toHaveBeenCalledExactlyOnceWith("all");
  });

  it("dismisses when clicking outside the dropdown", () => {
    render(
      <div>
        <RadioFilterDropdown
          label="Status"
          onChange={vi.fn()}
          options={OPTIONS}
          selected="all"
          testId="filter-status"
        />
        <div data-testid="outside">outside</div>
      </div>,
    );

    openDropdown();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("button", { name: "Active" })).not.toBeInTheDocument();
  });

  it("dismisses when pressing Escape", () => {
    render(
      <RadioFilterDropdown
        label="Status"
        onChange={vi.fn()}
        options={OPTIONS}
        selected="all"
        testId="filter-status"
      />,
    );

    openDropdown();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "Active" })).not.toBeInTheDocument();
  });
});
