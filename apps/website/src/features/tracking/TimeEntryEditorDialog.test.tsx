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

  it("shows the duplicate action for stopped entries", async () => {
    render(<DialogHarness onDuplicate={() => {}} selectedProjectId={44} selectedTagIds={[7]} />);

    expect(screen.getByRole("button", { name: "Duplicate entry" })).toBeTruthy();
  });

  it("hides the duplicate action for running entries", async () => {
    render(
      <DialogHarness
        entryOverrides={{
          duration: -1,
          stop: undefined,
        }}
        onDuplicate={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Duplicate entry" })).toBeNull();
  });

  it("opens a calendar date picker from the calendar icon and preserves the time when changing the start date", () => {
    const onStartTimeChange = vi.fn();

    render(<DialogHarness onStartTimeChange={onStartTimeChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit start date" }));

    const datePicker = screen.getByRole("dialog", { name: "March 2026" });
    expect(datePicker).toBeTruthy();
    expect(within(datePicker).getByText("March 2026")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "March 24, 2026" }));

    expect(onStartTimeChange).toHaveBeenCalledTimes(1);
    const nextDate = onStartTimeChange.mock.calls[0]?.[0] as Date;
    expect(nextDate.toISOString()).toBe("2026-03-24T10:00:00.000Z");
  });

  it("keeps the edited start time visible before save after the field blurs", () => {
    render(<DialogHarness onStartTimeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit start time" }));

    const timeInput = screen.getByLabelText("Edit time") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "15:28" } });
    fireEvent.blur(timeInput);

    expect(screen.getByRole("button", { name: "Edit start time" }).textContent).toContain("15:28");
  });
});

function DialogHarness({
  entryOverrides,
  onDuplicate,
  onStartTimeChange = () => {},
  selectedProjectId = null,
  selectedTagIds = [],
}: {
  entryOverrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>;
  onDuplicate?: () => void;
  onStartTimeChange?: (time: Date) => void;
  selectedProjectId?: number | null;
  selectedTagIds?: number[];
}) {
  const [entry, setEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry>(createTimeEntryFixture(entryOverrides));
  const [projectId, setProjectId] = useState<number | null>(selectedProjectId);
  const [tagIds, setTagIds] = useState<number[]>(selectedTagIds);

  return (
    <TimeEntryEditorDialog
      anchor={{ height: 40, left: 40, top: 40, width: 160 }}
      currentWorkspaceId={202}
      description="浪费时间"
      entry={entry}
      isCreatingProject={false}
      isCreatingTag={false}
      isPrimaryActionPending={false}
      isSaving={false}
      onClose={() => {}}
      onCreateProject={() => {}}
      onCreateTag={() => {}}
      onDuplicate={onDuplicate}
      onDescriptionChange={() => {}}
      onPrimaryAction={() => {}}
      onProjectSelect={setProjectId}
      onSave={() => {}}
      onStartTimeChange={(time) => {
        setEntry((current) => ({
          ...current,
          start: time.toISOString(),
        }));
        onStartTimeChange(time);
      }}
      onStopTimeChange={(time) => {
        setEntry((current) => ({
          ...current,
          stop: time.toISOString(),
        }));
      }}
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
