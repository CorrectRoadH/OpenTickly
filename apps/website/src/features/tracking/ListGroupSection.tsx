import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { ListEntryRow } from "./ListEntryRow.tsx";
import {
  formatClockDuration,
  formatGroupLabel,
  type DisplayEntry,
  type DurationFormat,
  type EntryGroup,
  type TimeFormat,
} from "./overview-data.ts";

export const LIST_VIEW_GRID_TEMPLATE_COLUMNS = "1fr 150px 30px auto auto 40px 30px";

export function ListGroupSection({
  durationFormat,
  expandedGroupKeys,
  group,
  isGroupFullySelected,
  isGroupPartiallySelected,
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
  selectedIds,
  tags,
  timeofdayFormat,
  timezone,
  toggleEntry,
  toggleGroup,
  workspaceName,
}: {
  durationFormat: DurationFormat;
  expandedGroupKeys: Set<string>;
  group: EntryGroup;
  isGroupFullySelected: (group: EntryGroup) => boolean;
  isGroupPartiallySelected: (group: EntryGroup) => boolean;
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
  selectedIds: Set<number>;
  tags: TimeEntryEditorTag[];
  timeofdayFormat: TimeFormat;
  timezone: string;
  toggleEntry: (id: number) => void;
  toggleGroup: (group: EntryGroup) => void;
  workspaceName: string;
}): ReactElement {
  const groupChecked = isGroupFullySelected(group);
  const groupIndeterminate = isGroupPartiallySelected(group);

  return (
    <ul
      className="grid border-b-[4px] border-[var(--track-border)]"
      style={{
        gridTemplateColumns: LIST_VIEW_GRID_TEMPLATE_COLUMNS,
      }}
    >
      <li className="col-span-full flex h-[50px] items-center px-5">
        <input
          aria-label={`Select all entries for ${formatGroupLabel(group.key, timezone)}`}
          checked={groupChecked}
          className={`size-[13px] shrink-0 cursor-pointer appearance-none rounded-[3px] border bg-transparent ${
            groupChecked || groupIndeterminate
              ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
              : "border-[var(--track-border)]"
          }`}
          onChange={() => toggleGroup(group)}
          ref={(el) => {
            if (el) el.indeterminate = groupIndeterminate;
          }}
          type="checkbox"
        />
        <p className="ml-3 flex-1 text-[14px] font-medium text-white">
          {formatGroupLabel(group.key, timezone)}
        </p>
        <p className="text-right text-[14px] font-medium tabular-nums text-white">
          {formatClockDuration(group.totalSeconds, durationFormat)}
        </p>
      </li>

      {group.entries.map((entry) => {
        const displayEntry = entry as DisplayEntry;
        const groupCount = displayEntry._groupCount ?? 0;
        const groupKey = `${group.key}-${entry.id}-${entry.description}`;
        const isExpanded = expandedGroupKeys.has(groupKey);
        const entriesToRender =
          groupCount > 1 && isExpanded ? [entry, ...(displayEntry._groupEntries ?? [])] : [entry];

        return entriesToRender.map((renderEntry, subIdx) => (
          <ListEntryRow
            durationFormat={durationFormat}
            entry={renderEntry}
            groupCount={groupCount}
            groupKey={groupKey}
            isExpanded={isExpanded}
            isSelected={typeof renderEntry.id === "number" && selectedIds.has(renderEntry.id)}
            onBillableToggle={onBillableToggle}
            onCollapseGroup={onCollapseGroup}
            onContinueEntry={onContinueEntry}
            onDeleteEntry={onDeleteEntry}
            onDescriptionChange={onDescriptionChange}
            onDuplicateEntry={onDuplicateEntry}
            onEditEntry={onEditEntry}
            onExpandGroup={onExpandGroup}
            onFavoriteEntry={onFavoriteEntry}
            onProjectChange={onProjectChange}
            onSplitEntry={onSplitEntry}
            onTagsChange={onTagsChange}
            projects={projects}
            subIdx={subIdx}
            tags={tags}
            timeofdayFormat={timeofdayFormat}
            timezone={timezone}
            toggleEntry={toggleEntry}
            workspaceName={workspaceName}
            key={`${renderEntry.id ?? "no-id"}-${subIdx}`}
          />
        ));
      })}
    </ul>
  );
}
