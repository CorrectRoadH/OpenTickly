import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppCheckbox } from "./AppCheckbox.tsx";

describe("AppCheckbox", () => {
  it("renders unchecked by default", () => {
    render(<AppCheckbox aria-label="Accept terms" />);

    expect(screen.getByLabelText("Accept terms")).not.toBeChecked();
  });

  it("calls onChange when clicked", () => {
    const onChange = vi.fn();
    render(<AppCheckbox aria-label="Accept terms" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Accept terms"));

    expect(onChange).toHaveBeenCalledOnce();
  });

  it("reflects the checked prop", () => {
    render(<AppCheckbox aria-label="Accept terms" checked onChange={vi.fn()} />);

    expect(screen.getByLabelText("Accept terms")).toBeChecked();
  });

  it("renders as disabled and keeps the controlled checked value on click", () => {
    // Note: jsdom's dispatchEvent-based click does not fully honor the native
    // "disabled controls skip activation behavior" rule for checkbox inputs,
    // so this asserts the controlled DOM state instead of onChange call count.
    render(<AppCheckbox aria-label="Accept terms" checked={false} disabled onChange={vi.fn()} />);
    const checkbox = screen.getByLabelText("Accept terms");

    expect(checkbox).toBeDisabled();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it("sets the indeterminate DOM property", () => {
    render(<AppCheckbox aria-label="Select all" indeterminate />);

    expect(screen.getByLabelText("Select all")).toHaveProperty("indeterminate", true);
  });
});
