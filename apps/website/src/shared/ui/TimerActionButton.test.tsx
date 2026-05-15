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
    expect(button.querySelector("svg")?.className.baseVal).not.toMatch(/(?:^|\s)scale-/);
  });

  test("keeps a compressed shadow while active", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });

    expect(button.className).toContain("active:shadow-[var(--track-depth-accent-shadow-active)]");
    expect(button.className).not.toContain("active:shadow-[var(--track-depth-shadow-active)]");
  });

  test("uses the same one-piece hover and press mechanics as app buttons", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });

    expect(button.className).toContain("hover:-translate-y-px");
    expect(button.className).toContain("active:translate-y-0.5");
    expect(button.className).toContain("hover:shadow-[var(--track-depth-accent-shadow-hover)]");
  });
});
