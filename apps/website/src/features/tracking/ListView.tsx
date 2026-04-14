import type { ReactElement } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";
import { ListGroupSection } from "./ListGroupSection.tsx";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import {
  BulkActionToolbar,
  BulkEditDialog,
  DeleteConfirmDialog,
  useListSelection,
} from "./list-bulk-actions.tsx";
import type { BulkEditUpdates } from "./list-bulk-actions.tsx";
import type { DurationFormat, EntryGroup, TimeFormat } from "./overview-data.ts";
import { SurfaceMessage } from "./overview-views.tsx";

export function ListView({
  durationFormat,
  groups,
  hasMore,
  isLoadingMore,
  onBillableToggle,
  onBulkDelete,
  onBulkEdit,
  onContinueEntry,
  onDeleteEntry,
  onDescriptionChange,
  onDuplicateEntry,
  onEditEntry,
  onFavoriteEntry,
  onLoadMore,
  onProjectChange,
  onSplitEntry,
  onTagsChange,
  onTaskChange,
  projects,
  tags,
  tasks,
  timeofdayFormat,
  timezone,
  workspaceName,
}: {
  durationFormat: DurationFormat;
  groups: EntryGroup[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onBulkDelete?: (ids: number[]) => void;
  onBulkEdit?: (ids: number[], updates: BulkEditUpdates) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDeleteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDescriptionChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    description: string,
  ) => void;
  onDuplicateEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onFavoriteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onLoadMore?: () => void;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  onSplitEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  onTaskChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number,
    taskId: number,
  ) => void;
  projects?: TimeEntryEditorProject[];
  tags?: TimeEntryEditorTag[];
  tasks?: ProjectPickerTask[];
  timeofdayFormat: TimeFormat;
  timezone: string;
  workspaceName?: string;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const {
    clearSelection,
    isGroupFullySelected,
    isGroupPartiallySelected,
    selectedIds,
    toggleEntry,
    toggleGroup,
  } = useListSelection(groups);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const resolvedProjects = projects ?? [];
  const resolvedTags = tags ?? [];
  const resolvedTasks = tasks ?? [];
  const resolvedWorkspaceName = workspaceName ?? "Workspace";

  const expandGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      next.add(groupKey);
      return next;
    });
  };
  const collapseGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  };

  if (groups.length === 0) {
    return <SurfaceMessage message={t("noTimeEntriesInThisWorkspaceYet")} />;
  }

  return (
    <div data-testid="timer-list-view">
      {selectedIds.size > 0 ? (
        <BulkActionToolbar
          count={selectedIds.size}
          onClear={clearSelection}
          onDelete={() => setDeleteConfirmOpen(true)}
          onEdit={() => setBulkEditOpen(true)}
        />
      ) : null}

      {bulkEditOpen ? (
        <BulkEditDialog
          count={selectedIds.size}
          onClose={() => setBulkEditOpen(false)}
          onSave={(updates) => {
            onBulkEdit?.([...selectedIds], updates);
            setBulkEditOpen(false);
            clearSelection();
          }}
          projects={resolvedProjects}
          tags={resolvedTags}
          workspaceName={resolvedWorkspaceName}
        />
      ) : null}

      {deleteConfirmOpen ? (
        <DeleteConfirmDialog
          count={selectedIds.size}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            onBulkDelete?.([...selectedIds]);
            setDeleteConfirmOpen(false);
            clearSelection();
          }}
        />
      ) : null}

      {groups.map((group) => (
        <ListGroupSection
          durationFormat={durationFormat}
          expandedGroupKeys={expandedGroupKeys}
          group={group}
          isGroupFullySelected={isGroupFullySelected}
          isGroupPartiallySelected={isGroupPartiallySelected}
          onBillableToggle={onBillableToggle}
          onCollapseGroup={collapseGroup}
          onContinueEntry={onContinueEntry}
          onDeleteEntry={onDeleteEntry}
          onDescriptionChange={onDescriptionChange}
          onDuplicateEntry={onDuplicateEntry}
          onEditEntry={onEditEntry}
          onExpandGroup={expandGroup}
          onFavoriteEntry={onFavoriteEntry}
          onProjectChange={onProjectChange}
          onSplitEntry={onSplitEntry}
          onTagsChange={onTagsChange}
          onTaskChange={onTaskChange}
          projects={resolvedProjects}
          selectedIds={selectedIds}
          tags={resolvedTags}
          tasks={resolvedTasks}
          timeofdayFormat={timeofdayFormat}
          timezone={timezone}
          toggleEntry={toggleEntry}
          toggleGroup={toggleGroup}
          workspaceName={resolvedWorkspaceName}
          key={group.key}
        />
      ))}

      {hasMore ? (
        <button
          className="mx-auto my-6 flex h-[38px] items-center justify-center rounded-lg border border-[var(--track-border)] px-6 text-[14px] font-medium text-white transition hover:bg-[var(--track-row-hover)] disabled:opacity-50"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {isLoadingMore ? t("loading") : t("loadMore")}
        </button>
      ) : null}
    </div>
  );
}
