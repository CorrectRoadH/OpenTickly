import { type ReactElement, useCallback, useMemo, useRef } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useBulkDeleteTimeEntriesMutation,
  useBulkEditTimeEntriesMutation,
  useCreateTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useStartTimeEntryMutation,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { resolveTimeEntryProjectId as resolveCanonicalTimeEntryProjectId } from "./time-entry-ids.ts";
import { SurfaceMessage } from "./overview-views.tsx";
import { ListView } from "./ListView.tsx";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { useTimeEntryViews } from "./useTimeEntryViews.ts";
import type { BulkEditUpdates } from "./BulkEditDialog.tsx";

function resolveTimeEntryProjectId(entry: {
  project_id?: number | null;
  pid?: number | null;
}): number | null {
  const projectId = resolveCanonicalTimeEntryProjectId(entry);
  if (projectId == null || projectId <= 0) return null;
  return projectId;
}

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
  const views = useTimeEntryViews({ workspaceId, timezone, showAllEntries });

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const bulkEditMutation = useBulkEditTimeEntriesMutation(workspaceId);
  const bulkDeleteMutation = useBulkDeleteTimeEntriesMutation(workspaceId);

  const mutRef = useRef({
    create: createTimeEntryMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  });
  mutRef.current = {
    create: createTimeEntryMutation,
    del: deleteTimeEntryMutation,
    update: updateTimeEntryMutation,
    bulkEdit: bulkEditMutation,
    bulkDelete: bulkDeleteMutation,
  };

  const handleEntryEdit = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => {
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
    },
    [],
  );

  const onContinueEntry = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      const continuedDescription = (entry.description ?? "").trim();
      void startTimeEntryMutation
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
    },
    [startTimeEntryMutation],
  );

  const onDeleteEntry = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        const snapshot = snapshotEntryForUndo(entry);
        void mutRef.current.del
          .mutateAsync({ timeEntryId: entry.id, workspaceId: wid })
          .then(() => {
            if (snapshot) onDeleteWithUndo(snapshot);
          });
      }
    },
    [onDeleteWithUndo],
  );

  const onDuplicateEntry = useCallback((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
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
  }, []);

  const onDescriptionChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, description: string) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { description },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );

  const onTagsChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { tagIds },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );

  const onBillableToggle = useCallback((entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof entry.id === "number" && typeof wid === "number") {
      void mutRef.current.update.mutateAsync({
        request: { billable: !entry.billable },
        timeEntryId: entry.id,
        workspaceId: wid,
      });
    }
  }, []);

  const onProjectChange = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, projectId: number | null) => {
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof entry.id === "number" && typeof wid === "number") {
        void mutRef.current.update.mutateAsync({
          request: { projectId },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
      }
    },
    [],
  );

  const onSplitEntry = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      if (entry.start && entry.stop) {
        handleEntryEdit(entry, new DOMRect(0, 0, 0, 0));
      }
    },
    [handleEntryEdit],
  );

  const onBulkEdit = useCallback(async (ids: number[], updates: BulkEditUpdates) => {
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
  }, []);

  const onBulkDelete = useCallback(async (ids: number[]) => {
    await mutRef.current.bulkDelete.mutateAsync(ids);
  }, []);

  const noopFavorite = useCallback(() => {}, []);

  const listViewProjects = useMemo(
    () =>
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
    [projectOptions],
  );

  const workspaceName = useMemo(
    () => session.availableWorkspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace",
    [session.availableWorkspaces, workspaceId],
  );

  if (views.timeEntriesQuery.isPending) {
    return <SurfaceMessage message="Loading time entries..." />;
  }
  if (views.timeEntriesQuery.isError) {
    return <SurfaceMessage message={views.timerErrorMessage} tone="error" />;
  }

  return (
    <ListView
      groups={views.groupedEntries}
      hasMore={views.hasMoreEntries}
      isLoadingMore={views.isLoadingMoreEntries}
      onLoadMore={views.loadMoreEntries}
      onBulkDelete={(ids) => void onBulkDelete(ids)}
      onBulkEdit={(ids, updates) => void onBulkEdit(ids, updates)}
      onContinueEntry={onContinueEntry}
      onDeleteEntry={onDeleteEntry}
      onDuplicateEntry={onDuplicateEntry}
      onDescriptionChange={onDescriptionChange}
      onEditEntry={handleEntryEdit}
      onFavoriteEntry={noopFavorite}
      onTagsChange={onTagsChange}
      onBillableToggle={onBillableToggle}
      onSplitEntry={onSplitEntry}
      onProjectChange={onProjectChange}
      projects={listViewProjects}
      tags={tagOptions}
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
