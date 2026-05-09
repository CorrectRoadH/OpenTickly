/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TimerActionButton } from "./TimerActionButton.tsx";

describe("TimerActionButton", () => {
  test("keeps a stable visual size after click feedback", () => {
    const onClick = vi.fn();

    render(<TimerActionButton isRunning={false} onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Start timer" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.className).not.toMatch(/(?:^|\s)scale-/);
    expect(button.firstElementChild?.className).not.toMatch(/(?:^|\s)scale-/);
  });

  test("keeps a compressed shadow while active", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });
    const face = button.firstElementChild;

    expect(face?.className).toContain("group-active:shadow-[0_1px_0_0_var(--track-accent-strong)]");
    expect(face?.className).not.toContain("group-active:shadow-[var(--track-depth-shadow-active)]");
  });

  test("raises the button face on hover without moving the hit target", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });
    const face = button.firstElementChild;

    expect(button.className).not.toMatch(/hover:-?translate-y/);
    expect(face?.className).toContain("group-hover:-translate-y-[3px]");
    expect(face?.className).toContain("group-active:translate-y-[3px]");
    expect(face?.className).toContain("before:transition-opacity");
    expect(face?.className).toContain("group-active:before:opacity-100");
    expect(face?.className).toContain("motion-reduce:transition-none");
  });
});
