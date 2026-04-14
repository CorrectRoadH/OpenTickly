import { type ReactElement, useRef } from "react";
import { useStableList } from "@opentoggl/web-ui";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useBulkDeleteTimeEntriesMutation,
  useBulkEditTimeEntriesMutation,
  useCreateTimeEntryMutation,
  useCreateWorkspaceFavoriteMutation,
  useDeleteTimeEntryMutation,
  useStartTimeEntryMutation,
  useTasksQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import { SurfaceMessage } from "./overview-views.tsx";
import { ListView } from "./ListView.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useTimeEntryViews } from "./useTimeEntryViews.ts";
import type { BulkEditUpdates } from "./BulkEditDialog.tsx";

type ListViewProject = {
  clientName?: string;
  color: string;
  id: number;
  name: string;
  pinned: boolean;
};
type ListViewTag = { id: number; name: string };
type ListViewTask = { id: number; name: string; projectId: number };

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

export function ConnectedListView({
  showAllEntries,
  onDeleteWithUndo,
}: {
  showAllEntries: boolean;
  onDeleteWithUndo: (snapshot: DeletedEntrySnapshot) => void;
}): ReactElement {
  const { workspaceId, timezone, session, projectOptions, tagOptions } = useWorkspaceData();
  const { durationFormat, timeofdayFormat } = useUserPreferences();
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries });

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const bulkEditMutation = useBulkEditTimeEntriesMutation(workspaceId);
  const bulkDeleteMutation = useBulkDeleteTimeEntriesMutation(workspaceId);

  const mutRef = useRef({
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  });
  mutRef.current = {
    create: createTimeEntryMutation,
    createFavorite: createWorkspaceFavoriteMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  };

  const handleEntryEdit = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    anchorRect: DOMRect,
  ) => {
    const pageContainer = document.querySelector<HTMLElement>(
      '[data-testid="tracking-timer-page"]',
    );
    const pageRect = pageContainer?.getBoundingClientRect();
    const pageLeft = pageRect?.left ?? 0;
    const pageTop = (pageRect?.top ?? 0) + window.scrollY;
    const containerWidth = pageContainer?.clientWidth ?? window.innerWidth;
    const anchorLeft = anchorRect.left - pageLeft;
    const preferredPlacement = anchorLeft > containerWidth / 2 ? "left" : "right";
    const store = useTimerViewStore.getState();
    store.setSelectedEntry(entry);
    store.setSelectedEntryAnchor({
      containerWidth,
      height: anchorRect.height,
      left: anchorLeft,
      preferredPlacement,
      top: anchorRect.top + window.scrollY - pageTop,
      width: anchorRect.width,
    });
  };

  const startMutRef = useRef(startTimeEntryMutation);
  startMutRef.current = startTimeEntryMutation;

  const onContinueEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const continuedDescription = (entry.description ?? "").trim();
    void startMutRef.current
      .mutateAsync({
        billable: entry.billable,
        description: continuedDescription,
        projectId: resolveTimeEntryProjectId(entry),
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      })
      .then(() => {
        useTimerViewStore.getState().setRunningDescription(continuedDescription);
      });
  };

  const onDeleteEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      const snapshot = snapshotEntryForUndo(entry);
      void mutRef.current.del.mutateAsync({ timeEntryId: entry.id, workspaceId: wid }).then(() => {
        if (snapshot) onDeleteWithUndo(snapshot);
      });
    }
  };

  const onDuplicateEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    if (entry.start && entry.stop) {
      const durationSec = Math.round(
        (new Date(entry.stop).getTime() - new Date(entry.start).getTime()) / 1000,
      );
      void mutRef.current.create.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        duration: durationSec,
        projectId: resolveTimeEntryProjectId(entry),
        start: entry.start,
        stop: entry.stop,
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
    }
  };

  const onDescriptionChange = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    description: string,
  ) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      void mutRef.current.update.mutateAsync({
        request: { description },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  };

  const onTagsChange = (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      void mutRef.current.update.mutateAsync({
        request: { tagIds },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  };

  const onBillableToggle = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      void mutRef.current.update.mutateAsync({
        request: { billable: !entry.billable },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  };

  const onProjectChange = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      const picked =
        projectId == null ? null : (projectOptions.find((p) => p.id === projectId) ?? null);
      void mutRef.current.update.mutateAsync({
        request: {
          projectColor: picked?.color ?? null,
          projectId,
          projectName: picked?.name ?? null,
        },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  };

  // Selecting a task from the inline project picker must assign BOTH the
  // host project and the task on the time entry in a single round-trip.
  // The shared `ProjectPickerDropdown` surfaces tasks as flat search
  // results and as per-project expandables; this handler backs the
  // `onTaskSelect` prop that `ListRowProjectPicker` threads through.
  const onTaskChange = (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number,
    taskId: number,
  ) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      const picked = projectOptions.find((p) => p.id === projectId) ?? null;
      void mutRef.current.update.mutateAsync({
        request: {
          projectColor: picked?.color ?? null,
          projectId,
          projectName: picked?.name ?? null,
          taskId,
        },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  };

  const onSplitEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    if (entry.start && entry.stop) {
      useTimerViewStore.getState().setPendingSplit(true);
      handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
    }
  };

  const onBulkEdit = async (ids: number[], updates: BulkEditUpdates) => {
    const operations: { op: "add" | "remove" | "replace"; path: string; value: unknown }[] = [];
    if (updates.description != null) {
      operations.push({ op: "replace", path: "/description", value: updates.description });
    }
    if (updates.projectId !== undefined) {
      operations.push({ op: "replace", path: "/project_id", value: updates.projectId ?? 0 });
    }
    if (updates.tagIds != null && updates.tagIds.length > 0) {
      operations.push({ op: "add", path: "/tag_ids", value: updates.tagIds });
    }
    if (updates.removeExistingTags) {
      operations.push({ op: "remove", path: "/tag_ids", value: [] });
    }
    if (updates.billable != null) {
      operations.push({ op: "replace", path: "/billable", value: updates.billable });
    }
    if (operations.length === 0) return;
    await mutRef.current.bulkEdit.mutateAsync({ operations, timeEntryIds: ids });
  };

  const onBulkDelete = async (ids: number[]) => {
    await mutRef.current.bulkDelete.mutateAsync(ids);
  };

  const onFavoriteEntry = (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    void mutRef.current.createFavorite.mutateAsync({
      billable: entry.billable ?? false,
      description: (entry.description ?? "").trim(),
      projectId: resolveTimeEntryProjectId(entry),
      tagIds: entry.tag_ids ?? [],
      taskId: entry.task_id ?? entry.tid ?? null,
    });
  };

  // Stabilize list-view projects/tags across re-renders so per-item
  // references survive unrelated parent re-renders. The `.map()` below
  // otherwise produces fresh objects each time, defeating the
  // `shallowListEqual` branch of `ListEntryRow`'s memo and cascading
  // into every row on every mutation settle.
  const listViewProjects = useStableList<ListViewProject>(
    projectOptions
      .filter((project) => project.id != null && project.active !== false)
      .map((project) => ({
        clientName: project.client_name ?? undefined,
        color: resolveProjectColorValue(project),
        id: project.id as number,
        name: project.name ?? "Untitled project",
        pinned: project.pinned === true,
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    (project) => project.id,
    (a, b) =>
      a.id === b.id &&
      a.name === b.name &&
      a.color === b.color &&
      a.pinned === b.pinned &&
      a.clientName === b.clientName,
  );
  const listViewTags = useStableList<ListViewTag>(
    tagOptions,
    (tag) => tag.id,
    (a, b) => a === b,
  );

  const tasksQuery = useTasksQuery(workspaceId);
  const listViewTasks = useStableList<ListViewTask>(
    (tasksQuery.data?.data ?? [])
      .filter(
        (task) =>
          task.id != null && !!task.name && task.project_id != null && task.active !== false,
      )
      .map((task) => ({
        id: task.id as number,
        name: task.name as string,
        projectId: task.project_id as number,
      })),
    (task) => task.id,
    (a, b) => a.id === b.id && a.name === b.name && a.projectId === b.projectId,
  );

  const workspaceName =
    session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace";

  if (views.timeEntriesQuery.isPending) {
    return <SurfaceMessage message="Loading time entries..." />;
  }
  if (views.timeEntriesQuery.isError) {
    return <SurfaceMessage message={views.timerErrorMessage} tone="error" />;
  }

  return (
    <ListView
      durationFormat={durationFormat}
      groups={views.groupedEntries}
      hasMore={views.hasMoreEntries}
      isLoadingMore={views.isLoadingMoreEntries}
      onLoadMore={views.loadMoreEntries}
      onBulkDelete={onBulkDelete}
      onBulkEdit={onBulkEdit}
      onContinueEntry={onContinueEntry}
      onDeleteEntry={onDeleteEntry}
      onDuplicateEntry={onDuplicateEntry}
      onDescriptionChange={onDescriptionChange}
      onEditEntry={handleEntryEdit}
      onFavoriteEntry={onFavoriteEntry}
      onTagsChange={onTagsChange}
      onBillableToggle={onBillableToggle}
      onSplitEntry={onSplitEntry}
      onProjectChange={onProjectChange}
      onTaskChange={onTaskChange}
      projects={listViewProjects}
      tags={listViewTags}
      tasks={listViewTasks}
      timeofdayFormat={timeofdayFormat}
      timezone={timezone}
      workspaceName={workspaceName}
    />
  );
}

function snapshotEntryForUndo(entry: {
  billable?: boolean | null;
  description?: string | null;
  duration?: number | null;
  project_id?: number | null;
  pid?: number | null;
  start?: string | null;
  stop?: string | null;
  tag_ids?: number[] | null;
  task_id?: number | null;
  tid?: number | null;
}): DeletedEntrySnapshot | null {
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
