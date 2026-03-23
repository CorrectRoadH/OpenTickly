import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { TimeEntryEditorDialog } from "./TimeEntryEditorDialog.tsx";

describe("TimeEntryEditorDialog", () => {
  it("shows selected project and tag pills after picking them", async () => {
    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Select project" }));
    fireEvent.click(screen.getByRole("button", { name: "Waste time No client" }));

    const projectButton = screen.getByRole("button", { name: "Select project" });
    expect(within(projectButton).getByText("Waste time")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select tags" }));
    fireEvent.click(screen.getByRole("button", { name: "4 象限" }));
    fireEvent.click(screen.getByRole("button", { name: "深度工作" }));

    const tagButton = screen.getByRole("button", { name: "Select tags" });
    expect(within(tagButton).getByText("4 象限 +1")).toBeTruthy();
  });

  it("copies the current entry summary", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });

    render(<DialogHarness selectedProjectId={44} selectedTagIds={[7]} />);

    expect(writeText).not.toHaveBeenCalled();
  });

  it("opens a calendar date picker and preserves the time when changing the start date", () => {
    const onStartTimeChange = vi.fn();

    render(<DialogHarness onStartTimeChange={onStartTimeChange} />);

    fireEvent.click(screen.getByRole("button", { name: "10:00" }));

    expect(screen.getByTestId("date-picker")).toBeTruthy();
    expect(screen.getByText("March 2026")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "March 24, 2026" }));

    expect(onStartTimeChange).toHaveBeenCalledTimes(1);
    const nextDate = onStartTimeChange.mock.calls[0]?.[0] as Date;
    expect(nextDate.toISOString()).toBe("2026-03-24T10:00:00.000Z");
  });
});

function DialogHarness({
  onStartTimeChange = () => {},
  selectedProjectId = null,
  selectedTagIds = [],
}: {
  onStartTimeChange?: (time: Date) => void;
  selectedProjectId?: number | null;
  selectedTagIds?: number[];
}) {
  const [projectId, setProjectId] = useState<number | null>(selectedProjectId);
  const [tagIds, setTagIds] = useState<number[]>(selectedTagIds);

  return (
    <TimeEntryEditorDialog
      anchor={{ height: 40, left: 40, top: 40, width: 160 }}
      currentWorkspaceId={202}
      description="浪费时间"
      entry={createTimeEntryFixture()}
      isCreatingProject={false}
      isCreatingTag={false}
      isPrimaryActionPending={false}
      isSaving={false}
      onClose={() => {}}
      onCreateProject={() => {}}
      onCreateTag={() => {}}
      onDescriptionChange={() => {}}
      onPrimaryAction={() => {}}
      onProjectSelect={setProjectId}
      onSave={() => {}}
      onStartTimeChange={onStartTimeChange}
      onStopTimeChange={() => {}}
      onTagToggle={(tagId) =>
        setTagIds((current) =>
          current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
        )
      }
      onWorkspaceSelect={() => {}}
      primaryActionIcon="stop"
      primaryActionLabel="Stop timer"
      projects={[
        {
          color: "#ef4444",
          id: 44,
          name: "Waste time",
        },
      ]}
      selectedProjectId={projectId}
      selectedTagIds={tagIds}
      tags={[
        {
          id: 7,
          name: "4 象限",
        },
        {
          id: 8,
          name: "深度工作",
        },
      ]}
      timezone="UTC"
      workspaces={[
        {
          id: 202,
          name: "North Ridge Delivery",
        },
      ]}
    />
  );
}

function createTimeEntryFixture(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    billable: false,
    description: "浪费时间",
    duration: 1800,
    id: 12,
    project_color: "#ef4444",
    project_id: 44,
    project_name: "Waste time",
    start: "2026-03-23T10:00:00Z",
    stop: "2026-03-23T10:30:00Z",
    tag_ids: [7],
    tags: ["4 象限"],
    workspace_id: 202,
    ...overrides,
  };
}
