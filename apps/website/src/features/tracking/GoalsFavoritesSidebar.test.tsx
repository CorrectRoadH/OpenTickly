/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";

import { GoalItem } from "./GoalsFavoritesSidebar.tsx";

function makeGoal(overrides: Partial<HandlergoalsApiResponse> = {}): HandlergoalsApiResponse {
  return {
    goal_id: 1,
    name: "Test Goal",
    comparison: "more_than",
    recurrence: "daily",
    target_seconds: 7200,
    current_recurrence_tracked_seconds: 3600,
    icon: "💻",
    active: true,
    ...overrides,
  };
}

// Wrap GoalItem for i18n — just suppress errors with a minimal provider
function renderGoalItem(goal: HandlergoalsApiResponse) {
  // GoalItem uses useTranslation, but in test we just check rendered output structure.
  // We render and catch translation key fallbacks.
  return render(<GoalItem goal={goal} />);
}

describe("GoalItem icon differentiation", () => {
  it("renders an upward indicator for more_than / gte goals", () => {
    renderGoalItem(makeGoal({ comparison: "more_than" }));
    const indicator = screen.getByTestId("goal-comparison-indicator");
    expect(indicator.getAttribute("data-comparison")).toBe("more_than");
    // Should contain an upward arrow element
    expect(indicator.querySelector("[data-direction='up']")).not.toBeNull();
  });

  it("renders a downward indicator for less_than / lte goals", () => {
    renderGoalItem(makeGoal({ comparison: "less_than" }));
    const indicator = screen.getByTestId("goal-comparison-indicator");
    expect(indicator.getAttribute("data-comparison")).toBe("less_than");
    expect(indicator.querySelector("[data-direction='down']")).not.toBeNull();
  });

  it("uses warning color for less_than goals under limit", () => {
    renderGoalItem(
      makeGoal({
        comparison: "less_than",
        target_seconds: 3600,
        current_recurrence_tracked_seconds: 1800, // 50% of limit
      }),
    );
    const ring = screen.getByTestId("goal-progress-ring");
    expect(ring.getAttribute("stroke")).toContain("warning-fill");
  });

  it("uses danger color for less_than goals that exceeded limit", () => {
    renderGoalItem(
      makeGoal({
        comparison: "less_than",
        target_seconds: 3600,
        current_recurrence_tracked_seconds: 3600, // 100% - exceeded
      }),
    );
    const ring = screen.getByTestId("goal-progress-ring");
    expect(ring.getAttribute("stroke")).toContain("danger-fill");
  });

  it("uses accent color for more_than goals", () => {
    renderGoalItem(
      makeGoal({
        comparison: "more_than",
        target_seconds: 7200,
        current_recurrence_tracked_seconds: 3600,
      }),
    );
    const ring = screen.getByTestId("goal-progress-ring");
    expect(ring.getAttribute("stroke")).toContain("accent");
  });
});
