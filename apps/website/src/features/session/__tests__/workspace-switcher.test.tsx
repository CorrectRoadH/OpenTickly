// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSwitcher } from "../WorkspaceSwitcher.tsx";

describe("workspace switcher", () => {
  it("emits the selected workspace id without owning another local session model", () => {
    const handleChange = vi.fn();

    render(
      <WorkspaceSwitcher
        currentWorkspaceId={202}
        onChange={handleChange}
        workspaces={[
          {
            id: 202,
            name: "North Ridge Delivery",
          },
          {
            id: 303,
            name: "North Ridge Studio",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "303" },
    });

    expect(handleChange).toHaveBeenCalledWith(303);
  });
});
