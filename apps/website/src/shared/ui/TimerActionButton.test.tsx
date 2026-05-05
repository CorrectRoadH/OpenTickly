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
  });

  test("keeps a compressed shadow while active", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });

    expect(button.className).toContain("active:shadow-[0_1px_0_0_var(--track-accent-strong)]");
    expect(button.className).not.toContain("active:shadow-[var(--track-depth-shadow-active)]");
  });

  test("uses a pronounced press animation without scaling the button", () => {
    render(<TimerActionButton isRunning={false} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Start timer" });

    expect(button.className).toContain("hover:-translate-y-[3px]");
    expect(button.className).toContain("active:translate-y-[3px]");
    expect(button.className).toContain("before:transition-opacity");
    expect(button.className).toContain("active:before:opacity-100");
    expect(button.className).toContain("motion-reduce:transition-none");
  });
});
