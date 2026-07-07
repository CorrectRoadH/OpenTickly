import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckboxFilterDropdown } from "./CheckboxFilterDropdown.tsx";

const OPTIONS = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
  { key: "c", label: "Gamma" },
];

function openDropdown() {
  fireEvent.click(screen.getByTestId("filter-status"));
}

describe("CheckboxFilterDropdown", () => {
  it("renders every option label once opened", () => {
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={OPTIONS}
        selected={new Set()}
        testId="filter-status"
      />,
    );

    openDropdown();

    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Gamma" })).toBeInTheDocument();
  });

  it("calls onToggle with the clicked option key", () => {
    const onToggle = vi.fn();
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={onToggle}
        options={OPTIONS}
        selected={new Set()}
        testId="filter-status"
      />,
    );

    openDropdown();
    fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("b");
  });

  it("marks selected options as checked", () => {
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={OPTIONS}
        selected={new Set(["b"])}
        testId="filter-status"
      />,
    );

    openDropdown();

    expect(screen.getByRole("checkbox", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("shows the clear affordance only when a selection is active", () => {
    const { rerender } = render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={OPTIONS}
        selected={new Set()}
        testId="filter-status"
      />,
    );

    expect(screen.queryByRole("button", { name: "" })).not.toBeInTheDocument();

    rerender(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={OPTIONS}
        selected={new Set(["a"])}
        testId="filter-status"
      />,
    );

    expect(screen.getByTestId("filter-status")).toHaveTextContent("Alpha");
    // The trigger chrome renders a small round "x" clear icon once active.
    const trigger = screen.getByTestId("filter-status");
    expect(trigger.querySelector('[role="button"]')).toBeInTheDocument();
  });

  it("calls onClear and does not toggle selection when the clear affordance is clicked", () => {
    const onClear = vi.fn();
    const onToggle = vi.fn();
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={onClear}
        onToggle={onToggle}
        options={OPTIONS}
        selected={new Set(["a"])}
        testId="filter-status"
      />,
    );

    const trigger = screen.getByTestId("filter-status");
    const clearIcon = trigger.querySelector('[role="button"]')!;
    fireEvent.click(clearIcon);

    expect(onClear).toHaveBeenCalledExactlyOnceWith();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("renders the empty message when there are no options to show", () => {
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No statuses found"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={[]}
        selected={new Set()}
        testId="filter-status"
      />,
    );

    openDropdown();

    expect(screen.getByText("No statuses found")).toBeInTheDocument();
  });

  it("dismisses when clicking outside the dropdown", () => {
    render(
      <div>
        <CheckboxFilterDropdown
          clearLabel="Clear all"
          emptyMessage="No results"
          label="Status"
          onClear={vi.fn()}
          onToggle={vi.fn()}
          options={OPTIONS}
          selected={new Set()}
          testId="filter-status"
        />
        <div data-testid="outside">outside</div>
      </div>,
    );

    openDropdown();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("checkbox", { name: "Alpha" })).not.toBeInTheDocument();
  });

  it("dismisses when pressing Escape", () => {
    render(
      <CheckboxFilterDropdown
        clearLabel="Clear all"
        emptyMessage="No results"
        label="Status"
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={OPTIONS}
        selected={new Set()}
        testId="filter-status"
      />,
    );

    openDropdown();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("checkbox", { name: "Alpha" })).not.toBeInTheDocument();
  });
});
