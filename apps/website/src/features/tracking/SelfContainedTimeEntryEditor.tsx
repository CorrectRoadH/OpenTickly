import { type ReactElement, useEffect, useMemo, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useSessionActions } from "../../shared/session/session-context.tsx";
import { useTasksQuery } from "../../shared/query/web-shell.ts";
import type { ProjectPickerTask } from "./bulk-edit-pickers.tsx";
import type { DurationFormat, TimeFormat } from "./overview-data.ts";
import { SplitTimeEntryDialog } from "./SplitTimeEntryDialog.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import {
  TimeEntryEditorDialog,
  type TimeEntryEditorAnchor,
  type TimeEntryEditorProject,
  type TimeEntryEditorTag,
  type TimeEntryEditorWorkspace,
} from "./TimeEntryEditorDialog.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useTimeEntryEditor } from "./useTimeEntryEditor.ts";

type DeletedEntrySnapshot = {
  billable: boolean;
  description: string;
  duration: number;
  projectId: number | null;
  start: string;
  stop: string;
  tagIds: number[];
  taskId: number | null;
};

function snapshotEntryForUndo(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry,
): DeletedEntrySnapshot | null {
  if (!entry.start || !entry.stop) return null;
  const durationSec = Math.round(
    (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
  );
  return {
    billable: entry.billable ?? false,
    description: (entry.description ?? "").trim(),
    duration: durationSec,
    projectId: resolveTimeEntryProjectId(entry),
    start: entry.start,
    stop: entry.stop,
    tagIds: entry.tag_ids ?? [],
    taskId: entry.task_id ?? entry.tid ?? null,
  };
}

function isEntryAlreadyFavorited(
  entry: { description: string; project_id: number | null; tag_ids: number[] },
  favorites: Array<{ description?: string; project_id?: number; tag_ids?: number[] }>,
): boolean {
  const desc = entry.description.trim().toLowerCase();
  const projectId = entry.project_id;
  const tagIds = [...entry.tag_ids].sort((a, b) => a - b);
  return favorites.some((fav) => {
    const favTags = [...(fav.tag_ids ?? [])].sort((a, b) => a - b);
    return (
      (fav.description ?? "").trim().toLowerCase() === desc &&
      (fav.project_id ?? null) === projectId &&
      tagIds.length === favTags.length &&
      tagIds.every((id, i) => id === favTags[i])
    );
  });
}

type SelfContainedTimeEntryEditorProps = {
  anchor: TimeEntryEditorAnchor;
  currentWorkspaceId: number;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  favorites: Array<{ description?: string; project_id?: number; tag_ids?: number[] }>;
  isNewEntry: boolean;
  onClose: () => void;
  onDeleteWithUndo?: (snapshot: DeletedEntrySnapshot) => void;
  projects: TimeEntryEditorProject[];
  recentEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  tags: TimeEntryEditorTag[];
  durationFormat: DurationFormat;
  timeofdayFormat: TimeFormat;
  timezone: string;
  workspaces: TimeEntryEditorWorkspace[];
};

export function SelfContainedTimeEntryEditor({
  anchor,
  currentWorkspaceId,
  entry: initialEntry,
  favorites,
  isNewEntry,
  onClose,
  onDeleteWithUndo,
  projects,
  recentEntries,
  tags,
  durationFormat,
  timeofdayFormat,
  timezone,
  workspaces,
}: SelfContainedTimeEntryEditorProps): ReactElement {
  const editor = useTimeEntryEditor(initialEntry, isNewEntry, onClose, {
    currentWorkspaceId,
    initialProjects: projects,
    initialRecentEntries: recentEntries,
    initialTags: tags,
    timezone,
  });
  const { setCurrentWorkspaceId } = useSessionActions();
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  // Tasks for the project picker
  const tasksQuery = useTasksQuery(currentWorkspaceId);
  const pickerTasks: ProjectPickerTask[] = useMemo(
    () =>
      (tasksQuery.data?.data ?? [])
        .filter((t) => t.id != null && t.name && t.project_id != null && t.active !== false)
        .map((t) => ({ id: t.id!, name: t.name!, projectId: t.project_id! })),
    [tasksQuery.data],
  );
  const selectedTaskName = useMemo(
    () => pickerTasks.find((t) => t.id === editor.taskId)?.name ?? null,
    [pickerTasks, editor.taskId],
  );

  // Auto-open split dialog when triggered from context menu
  const pendingSplit = useTimerViewStore((s) => s.pendingSplit);
  useEffect(() => {
    if (pendingSplit) {
      setSplitDialogOpen(true);
      useTimerViewStore.getState().setPendingSplit(false);
    }
  }, [pendingSplit]);

  return (
    <>
      {splitDialogOpen && editor.entry.start && editor.entry.stop ? (
        <SplitTimeEntryDialog
          start={editor.entry.start}
          stop={editor.entry.stop}
          onCancel={() => setSplitDialogOpen(false)}
          onConfirm={(splitAtMs) => {
            setSplitDialogOpen(false);
            void editor.split(splitAtMs);
          }}
        />
      ) : null}
      <TimeEntryEditorDialog
        anchor={anchor}
        currentWorkspaceId={editor.workspaceId}
        description={editor.description}
        durationFormat={durationFormat}
        entry={editor.entry}
        isCreatingProject={editor.isCreatingProject}
        isCreatingTag={editor.isCreatingTag}
        isDeleting={editor.isDeleting}
        isDirty={editor.isDirty}
        isNewEntry={editor.isNewEntry}
        isPrimaryActionPending={editor.isPrimaryActionPending}
        isSaving={editor.isSaving}
        onBillableToggle={editor.toggleBillable}
        onClose={editor.close}
        onCreateProject={editor.createProject}
        onCreateTag={editor.createTag}
        onDelete={
          isNewEntry
            ? undefined
            : () => {
                const snapshot = snapshotEntryForUndo(editor.entry);
                void editor.deleteEntry().then(() => {
                  if (snapshot && onDeleteWithUndo) onDeleteWithUndo(snapshot);
                });
              }
        }
        onDescriptionChange={editor.setDescription}
        onDiscard={editor.discard}
        onDuplicate={isNewEntry ? undefined : () => void editor.duplicate()}
        onFavorite={
          isNewEntry ||
          isEntryAlreadyFavorited(
            {
              description: editor.description,
              project_id: editor.projectId,
              tag_ids: editor.tagIds,
            },
            favorites,
          )
            ? undefined
            : () => void editor.favorite()
        }
        onPrimaryAction={isNewEntry ? undefined : () => void editor.primaryAction()}
        onProjectSelect={editor.setProjectId}
        onSave={() => void editor.save()}
        onSplit={isNewEntry ? undefined : () => setSplitDialogOpen(true)}
        onStartTimeChange={editor.changeStartTime}
        onStopTimeChange={editor.changeStopTime}
        onSuggestionEntrySelect={editor.selectSuggestion}
        onTaskSelect={(projectId, taskId) => {
          editor.setProjectId(projectId);
          editor.setTaskId(taskId);
        }}
        onTagToggle={(tagId) => {
          editor.setTagIds((current) =>
            current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
          );
        }}
        onWorkspaceSelect={(nextWorkspaceId) => {
          setCurrentWorkspaceId(nextWorkspaceId);
          onClose();
        }}
        primaryActionIcon={editor.primaryActionIcon}
        primaryActionLabel={editor.primaryActionLabel}
        projects={editor.projects}
        recentEntries={editor.recentEntries}
        saveError={editor.error}
        selectedProjectId={editor.projectId}
        selectedTagIds={editor.tagIds}
        selectedTaskName={selectedTaskName}
        tags={editor.tags}
        tasks={pickerTasks}
        timeofdayFormat={timeofdayFormat}
        timezone={editor.timezone}
        workspaces={workspaces}
      />
    </>
  );
}
