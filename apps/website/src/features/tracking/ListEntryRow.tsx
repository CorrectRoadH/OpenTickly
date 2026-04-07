import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { DollarIcon, PlayIcon } from "../../shared/ui/icons.tsx";
import { LiveDuration } from "./LiveDuration.tsx";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import {
  InlineDescription,
  ListRowMoreActions,
  ListRowProjectPicker,
  ListRowTagPicker,
} from "./list-view-inline-editors.tsx";
import {
  formatClockDuration,
  formatEntryRange,
  resolveEntryDurationSeconds,
  type DurationFormat,
  type TimeFormat,
} from "./overview-data.ts";

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

export function ListEntryRow({
  durationFormat,
  entry,
  groupCount,
  groupKey,
  isExpanded,
  isSelected,
  onBillableToggle,
  onCollapseGroup,
  onContinueEntry,
  onDeleteEntry,
  onDescriptionChange,
  onDuplicateEntry,
  onEditEntry,
  onExpandGroup,
  onFavoriteEntry,
  onProjectChange,
  onSplitEntry,
  onTagsChange,
  projects,
  subIdx,
  tags,
  timeofdayFormat,
  timezone,
  toggleEntry,
  workspaceName,
}: {
  durationFormat: DurationFormat;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  groupCount: number;
  groupKey: string;
  isExpanded: boolean;
  isSelected: boolean;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onCollapseGroup: (groupKey: string) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDeleteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDescriptionChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    description: string,
  ) => void;
  onDuplicateEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onExpandGroup: (groupKey: string) => void;
  onFavoriteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  onSplitEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  projects: TimeEntryEditorProject[];
  subIdx: number;
  tags: TimeEntryEditorTag[];
  timeofdayFormat: TimeFormat;
  timezone: string;
  toggleEntry: (id: number) => void;
  workspaceName: string;
}): ReactElement {
  const entryId = entry.id;
  const isCollapsedRow = groupCount > 1 && !isExpanded && subIdx === 0;
  const isExpandedGroup = groupCount > 1 && isExpanded;

  return (
    <li
      className={`group col-span-full grid min-h-[58px] items-center py-1 pr-2 pl-5 text-[14px] text-white transition-colors hover:bg-[var(--track-row-hover)] ${
        isSelected ? "bg-[var(--track-row-hover)]" : ""
      } ${isExpandedGroup ? "bg-[var(--track-row-hover)]/50" : ""}`}
      data-entry-description={entry.description?.trim() || ""}
      data-entry-id={typeof entry.id === "number" ? String(entry.id) : undefined}
      data-testid="time-entry-list-row"
      style={{
        gridTemplateColumns: "subgrid",
      }}
    >
      <div className="flex min-w-0 items-center gap-0">
        <div className="flex w-[30px] shrink-0 items-center justify-center">
          <input
            aria-label={`Select ${entry.description?.trim() || "time entry"}`}
            checked={isSelected}
            className={`size-[13px] cursor-pointer appearance-none rounded-[3px] border bg-transparent opacity-0 transition group-hover:opacity-100 ${
              isSelected
                ? "!opacity-100 border-[var(--track-accent)] bg-[var(--track-accent)]"
                : "border-[var(--track-border)]"
            }`}
            onChange={() => {
              if (typeof entryId === "number") toggleEntry(entryId);
            }}
            type="checkbox"
          />
        </div>

        {isCollapsedRow ? (
          <button
            aria-label={`Expand ${groupCount} similar entries`}
            className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-border)] text-[11px] font-semibold tabular-nums text-[var(--track-text-muted)] hover:border-[var(--track-text-disabled)] hover:text-white"
            onClick={() => onExpandGroup(groupKey)}
            type="button"
          >
            {groupCount}
          </button>
        ) : groupCount > 1 && isExpanded && subIdx === 0 ? (
          <button
            aria-label="Collapse similar entries"
            className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-accent)] text-[11px] font-semibold tabular-nums text-[var(--track-accent)] hover:bg-[var(--track-accent)]/10"
            onClick={() => onCollapseGroup(groupKey)}
            type="button"
          >
            {groupCount}
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <InlineDescription
              entry={entry}
              isRunning={isRunningTimeEntry(entry)}
              onChange={onDescriptionChange}
            />
            <ListRowProjectPicker
              entry={entry}
              onProjectChange={onProjectChange}
              projects={projects}
              workspaceName={workspaceName}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden">
        <ListRowTagPicker entry={entry} onTagsChange={onTagsChange} tags={tags} />
      </div>

      <button
        aria-label={entry.billable ? "Set as non-billable" : "Set as billable"}
        className={`flex size-[30px] items-center justify-center rounded transition ${
          entry.billable
            ? "text-[var(--track-warning-text)]"
            : "text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
        }`}
        onClick={() => onBillableToggle?.(entry)}
        type="button"
      >
        <DollarIcon className="size-4" />
      </button>

      <button
        aria-label={`Edit ${entry.description?.trim() || "time entry"}`}
        className="flex items-center justify-end whitespace-nowrap text-[14px] font-medium tabular-nums"
        data-testid="time-entry-list-edit-button"
        onClick={(event) => onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())}
        type="button"
      >
        {isRunningTimeEntry(entry) ? (
          <LiveDuration className="text-[var(--track-text-muted)]" entry={entry} />
        ) : (
          <span className="text-[var(--track-text-muted)]">
            {formatClockDuration(resolveEntryDurationSeconds(entry), durationFormat)}
          </span>
        )}
      </button>

      <button
        className="flex items-center justify-end whitespace-nowrap pl-3 text-[14px] font-medium tabular-nums"
        onClick={(event) => onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())}
        type="button"
      >
        <span className="text-[var(--track-text-muted)]">
          {formatEntryRange(entry, timezone, timeofdayFormat)}
        </span>
      </button>

      <div className="flex items-center justify-center">
        <button
          aria-label={`Continue ${entry.description?.trim() || "time entry"}`}
          className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
          onClick={() => onContinueEntry?.(entry)}
          type="button"
        >
          <PlayIcon className="size-3" />
        </button>
      </div>

      <ListRowMoreActions
        entry={entry}
        onBillableToggle={onBillableToggle}
        onContinue={onContinueEntry}
        onDelete={onDeleteEntry}
        onDuplicate={onDuplicateEntry}
        onFavorite={onFavoriteEntry}
        onSplit={onSplitEntry}
      />
    </li>
  );
}
