/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimerComposerSuggestionsDialog } from "./TimerComposerSuggestionsDialog.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  };
});

describe("TimerComposerSuggestionsDialog", () => {
  it("uses a real dropdown for workspace switching", () => {
    const onWorkspaceSelect = vi.fn();

    render(
      <TimerComposerSuggestionsDialog
        anchor={{ height: 40, left: 16, top: 16, width: 520 }}
        currentWorkspaceId={2}
        onClose={vi.fn()}
        onProjectSelect={vi.fn()}
        onTimeEntrySelect={vi.fn()}
        onWorkspaceSelect={onWorkspaceSelect}
        projects={[]}
        timeEntries={[]}
        workspaces={[
          { id: 1, name: "Personal Workspace" },
          { id: 2, isCurrent: true, name: "Team Workspace" },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "change" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox", { name: "workspaceFallback" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "workspaceFallback" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Personal Workspace" }));

    expect(onWorkspaceSelect).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("listbox", { name: "workspaceFallback" })).not.toBeInTheDocument();
  });
});
