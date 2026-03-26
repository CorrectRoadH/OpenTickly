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

  it("shows discard confirmation instead of closing immediately when Escape is pressed with dirty edits", () => {
    render(<DialogHarness isDirty />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByTestId("time-entry-editor-discard-confirmation")).toBeTruthy();
    expect(screen.getByTestId("time-entry-editor-dialog")).toBeTruthy();
  });

  it("shows discard confirmation instead of closing immediately when the close button is clicked with dirty edits", () => {
    render(<DialogHarness isDirty />);

    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));

    expect(screen.getByTestId("time-entry-editor-discard-confirmation")).toBeTruthy();
    expect(screen.getByTestId("time-entry-editor-dialog")).toBeTruthy();
  });

  it("opens anchored date pickers for start and stop fields", () => {
    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Edit start date" }));
    expect(screen.getByTestId("date-picker")).toBeTruthy();
    expect(screen.getByTestId("time-entry-editor-start-date-picker")).toBeTruthy();
    expect(screen.queryByTestId("time-entry-editor-stop-date-picker")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit stop date" }));
    expect(screen.getByTestId("date-picker")).toBeTruthy();
    expect(screen.getByTestId("time-entry-editor-stop-date-picker")).toBeTruthy();
    expect(screen.queryByTestId("time-entry-editor-start-date-picker")).toBeNull();
  });

  it("keeps the editor open after selecting a start date while dirty", () => {
    render(<DialogHarness isDirty />);

    fireEvent.click(screen.getByRole("button", { name: "Edit start date" }));
    fireEvent.click(screen.getByRole("button", { name: "March 24, 2026" }));

    expect(screen.getByTestId("time-entry-editor-dialog")).toBeTruthy();
    expect(screen.queryByTestId("time-entry-editor-discard-confirmation")).toBeNull();
  });

  it("prefers rendering to the left of the anchor when the anchor is near the right edge", () => {
    render(
      <DialogHarness
        anchor={{
          containerWidth: 720,
          height: 40,
          left: 620,
          preferredPlacement: "left",
          top: 40,
          width: 40,
        }}
      />,
    );

    const dialog = screen.getByTestId("time-entry-editor-dialog");
    expect(dialog.style.left).toBe("252px");
  });
});

function DialogHarness({
  entryOverrides,
  anchor = { height: 40, left: 40, top: 40, width: 160 },
  isDirty = false,
  onDuplicate,
  onStartTimeChange = () => {},
  selectedProjectId = null,
  selectedTagIds = [],
}: {
  anchor?: {
    containerWidth?: number;
    height: number;
    left: number;
    preferredPlacement?: "left" | "right";
    top: number;
    width: number;
  };
  entryOverrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>;
  isDirty?: boolean;
  onDuplicate?: () => void;
  onStartTimeChange?: (time: Date) => void;
  selectedProjectId?: number | null;
  selectedTagIds?: number[];
}) {
  const [entry, setEntry] = useState<GithubComTogglTogglApiInternalModelsTimeEntry>(
    createTimeEntryFixture(entryOverrides),
  );
  const [projectId, setProjectId] = useState<number | null>(selectedProjectId);
  const [tagIds, setTagIds] = useState<number[]>(selectedTagIds);

  return (
    <TimeEntryEditorDialog
      anchor={anchor}
      currentWorkspaceId={202}
      description="浪费时间"
      entry={entry}
      isCreatingProject={false}
      isCreatingTag={false}
      isDirty={isDirty}
      isPrimaryActionPending={false}
      isSaving={false}
      onClose={() => {}}
      onBillableToggle={() => {}}
      onCreateProject={() => {}}
      onCreateTag={() => {}}
      onDuplicate={onDuplicate}
      onDescriptionChange={() => {}}
      onFavorite={() => {}}
      onPrimaryAction={() => {}}
      onProjectSelect={setProjectId}
      onSave={() => {}}
      onSplit={() => {}}
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
      onSuggestionEntrySelect={() => {}}
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
      recentEntries={[]}
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
