/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

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

describe("recent entry metadata", () => {
  it("preserves task and billable metadata when selecting a search result", () => {
    const onSelect = vi.fn();
    render(
      <TimerComposerSuggestionsDialog
        anchor={{ height: 40, left: 16, top: 16, width: 520 }}
        currentWorkspaceId={1}
        onClose={vi.fn()}
        onProjectSelect={vi.fn()}
        onTimeEntrySelect={onSelect}
        onWorkspaceSelect={vi.fn()}
        projects={[]}
        timeEntries={[]}
        workspaces={[]}
        query="Review"
        searchResults={[
          {
            id: 10,
            workspace_id: 1,
            description: "Review",
            project_id: 2,
            task_id: 3,
            task_name: "Design",
            tag_ids: [4],
            tags: ["Work"],
            billable: true,
            start: "2026-11-07T10:00:00Z",
            duration: 60,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 3,
        tag_ids: [4],
        billable: true,
      }),
    );
  });
});
