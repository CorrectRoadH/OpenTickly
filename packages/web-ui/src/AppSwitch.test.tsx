import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppSwitch } from "./AppSwitch.tsx";

describe("AppSwitch", () => {
  it("renders unchecked by default", () => {
    render(<AppSwitch aria-label="Notifications" />);

    expect(screen.getByRole("switch", { name: "Notifications" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onChange with the next value when toggled (controlled)", () => {
    const onChange = vi.fn();
    render(<AppSwitch aria-label="Notifications" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Notifications" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("toggles its own aria-checked state when uncontrolled", () => {
    render(<AppSwitch aria-label="Notifications" defaultChecked={false} />);
    const toggle = screen.getByRole("switch", { name: "Notifications" });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("does not call onChange or change state when disabled", () => {
    const onChange = vi.fn();
    render(<AppSwitch aria-label="Notifications" disabled onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: "Notifications" });

    fireEvent.click(toggle);

    expect(onChange).not.toHaveBeenCalled();
    expect(toggle).toBeDisabled();
  });

  it("does not call onChange while loading", () => {
    const onChange = vi.fn();
    render(<AppSwitch aria-label="Notifications" loading onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Notifications" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
