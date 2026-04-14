import { memo, type ReactElement } from "react";
import { useRenderCount } from "@uidotdev/usehooks";
import { useTranslation } from "react-i18next";

import { AppCheckbox } from "@opentoggl/web-ui";

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

// Memo boundary so that unrelated list rows skip re-rendering when a single
// entry is mutated. Upstream `stabilizeEntryGroups` preserves entry object
// identity for unchanged entries across time-entries query updates, so a
// shallow check on `entry` is a reliable "nothing to draw here" signal.
//
// We use a custom comparator rather than default shallow equality because
// several props in this tree are not ref-stable across list-parent renders
// (e.g. the `projects` / `tags` arrays come from recomputed `.map().sort()`
// chains, and mutation callbacks are regenerated from closures over React
// Query handles). The visual output of a row only depends on the props
// enumerated below; callbacks dispatch actions that capture the current
// entry, so their identity does not affect what the row draws.
//
// Staleness trade-off: if `projects` or `tags` metadata changes (e.g. a
// project is renamed) without the row's own entry changing, the row will
// keep showing the old name until the entry itself is updated. That's an
// accepted trade for avoiding O(N) re-renders per unrelated mutation.
function arePropsEqual(
  prev: Parameters<typeof ListEntryRowImpl>[0],
  next: Parameters<typeof ListEntryRowImpl>[0],
): boolean {
  return (
    prev.entry === next.entry &&
    prev.isSelected === next.isSelected &&
    prev.isExpanded === next.isExpanded &&
    prev.groupCount === next.groupCount &&
    prev.groupKey === next.groupKey &&
    prev.subIdx === next.subIdx &&
    prev.durationFormat === next.durationFormat &&
    prev.timeofdayFormat === next.timeofdayFormat &&
    prev.timezone === next.timezone &&
    prev.workspaceName === next.workspaceName
  );
}

export const ListEntryRow = memo(ListEntryRowImpl, arePropsEqual);

function ListEntryRowImpl({
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
  const { t } = useTranslation("tracking");
  const entryId = entry.id;
  const isCollapsedRow = groupCount > 1 && !isExpanded && subIdx === 0;
  const isExpandedGroup = groupCount > 1 && isExpanded;
  const renderCount = useRenderCount();

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
          <AppCheckbox
            aria-label={`Select ${entry.description?.trim() || "time entry"}`}
            checked={isSelected}
            className={`opacity-0 transition group-hover:opacity-100 ${isSelected ? "!opacity-100" : ""}`}
            onChange={() => {
              if (typeof entryId === "number") toggleEntry(entryId);
            }}
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
            aria-label={t("collapseSimilarEntries")}
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
            {import.meta.env.DEV ? (
              <span
                className="shrink-0 font-mono text-[11px] leading-tight text-[var(--track-text-muted)]"
                data-testid={`list-entry-rendercount-${entryId ?? "unknown"}`}
              >
                renders: {renderCount}
              </span>
            ) : null}
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
