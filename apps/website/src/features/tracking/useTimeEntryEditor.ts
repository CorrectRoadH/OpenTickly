import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCreateProjectMutation,
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useCreateWorkspaceFavoriteMutation,
  useDeleteTimeEntryMutation,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTagsQuery,
  useTimeEntriesQuery,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { resolveEntryDurationSeconds } from "./overview-data.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { useSession } from "../../shared/session/session-context.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTrackIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

function resolveSingleTimerErrorMessage(error: unknown): string {
  if (error instanceof WebApiError) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data;
    }
    if (
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof error.data.message === "string"
    ) {
      return error.data.message;
    }
    return error.message;
  }
  return "We could not update this time entry right now.";
}

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return entry.stop == null || (entry.duration ?? 0) < 0;
}

function areNumberListsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface TimeEntryEditorState {
  // Field state
  description: string;
  setDescription: (value: string) => void;
  projectId: number | null;
  setProjectId: (id: number | null) => void;
  tagIds: number[];
  setTagIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  error: string | null;
  isDirty: boolean;
  isNewEntry: boolean;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;

  // Data
  projects: TimeEntryEditorProject[];
  tags: TimeEntryEditorTag[];
  recentEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  workspaceId: number;
  timezone: string;

  // Loading states
  isSaving: boolean;
  isCreatingProject: boolean;
  isCreatingTag: boolean;
  isDeleting: boolean;
  isPrimaryActionPending: boolean;
  primaryActionIcon: "play" | "stop";
  primaryActionLabel: string;

  // Handlers
  save: () => Promise<void>;
  deleteEntry: () => Promise<void>;
  duplicate: () => Promise<void>;
  favorite: () => Promise<void>;
  split: (splitAtMs?: number) => Promise<void>;
  createProject: (name: string, color?: string) => Promise<void>;
  createTag: (name: string) => Promise<void>;
  toggleBillable: () => void;
  changeStartTime: (time: Date) => void;
  changeStopTime: (time: Date) => void;
  selectSuggestion: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  primaryAction: () => Promise<void>;
  close: () => void;
  discard: () => void;
}

export function useTimeEntryEditor(
  initialEntry: GithubComTogglTogglApiInternalModelsTimeEntry,
  isNew: boolean,
  onClose: () => void,
): TimeEntryEditorState {
  const { t } = useTranslation("toast");
  const session = useSession();
  const currentWorkspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";

  // Entry state — we keep a mutable copy so time edits update in place
  const [entry, setEntry] = useState(initialEntry);
  const [isNewEntry] = useState(isNew);

  // Field state — initialized from entry
  const [description, setDescription] = useState(initialEntry.description ?? "");
  const [projectId, setProjectId] = useState<number | null>(
    resolveTimeEntryProjectId(initialEntry),
  );
  const [tagIds, setTagIds] = useState<number[]>(initialEntry.tag_ids ?? []);
  const [error, setError] = useState<string | null>(null);

  // Workspace for queries/mutations
  const entryWorkspaceId = useMemo(() => {
    const wid = entry.workspace_id ?? entry.wid;
    return typeof wid === "number" ? wid : currentWorkspaceId;
  }, [entry, currentWorkspaceId]);

  // Dirty check
  const isDirty = useMemo(() => {
    const originalProjectId = resolveTimeEntryProjectId(initialEntry);
    const originalTagIds = initialEntry.tag_ids ?? [];
    return (
      description !== (initialEntry.description ?? "") ||
      projectId !== originalProjectId ||
      !areNumberListsEqual(tagIds, originalTagIds) ||
      (entry.start ?? null) !== (initialEntry.start ?? null) ||
      (entry.stop ?? null) !== (initialEntry.stop ?? null)
    );
  }, [description, projectId, tagIds, entry.start, entry.stop, initialEntry]);

  // Queries — React Query caches these, no duplicate fetches
  const projectsQuery = useProjectsQuery(entryWorkspaceId, "all");
  const tagsQuery = useTagsQuery(entryWorkspaceId);
  const recentTimeEntriesQuery = useTimeEntriesQuery({});

  // Mutations
  const createProjectMutation = useCreateProjectMutation(entryWorkspaceId);
  const createTimeEntryMutation = useCreateTimeEntryMutation(entryWorkspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(entryWorkspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(currentWorkspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const createTagMutation = useCreateTagMutation(entryWorkspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();

  // Normalize projects for the editor
  const projects = useMemo<TimeEntryEditorProject[]>(() => {
    const raw = projectsQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p) => p.id != null && p.active !== false)
      .map((p) => ({
        clientName: p.client_name ?? undefined,
        color: resolveProjectColorValue(p),
        id: p.id as number,
        name: p.name ?? "Untitled project",
        pinned: p.pinned === true,
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [projectsQuery.data]);

  // Normalize tags
  const tags = useMemo<TimeEntryEditorTag[]>(() => {
    const raw = tagsQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is { id: number; name: string } => t.id != null && t.name != null);
  }, [tagsQuery.data]);

  // Recent entries for suggestion surface
  const recentEntries = useMemo(() => {
    const raw = recentTimeEntriesQuery.data;
    return Array.isArray(raw) ? raw : [];
  }, [recentTimeEntriesQuery.data]);

  // Primary action state
  const isRunning = isRunningTimeEntry(entry);
  const isPrimaryActionPending =
    startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;
  const primaryActionIcon = isRunning ? ("stop" as const) : ("play" as const);
  const primaryActionLabel = isRunning ? t("stopTimer") : t("continueTimeEntry");

  // Loading states
  const isSaving = isNewEntry
    ? createTimeEntryMutation.isPending
    : updateTimeEntryMutation.isPending;
  const isCreatingProject = createProjectMutation.isPending;
  const isCreatingTag = createTagMutation.isPending;
  const isDeleting = deleteTimeEntryMutation.isPending;

  // Handlers
  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const discard = useCallback(() => {
    onClose();
  }, [onClose]);

  const save = useCallback(async () => {
    if (isNewEntry) {
      try {
        const durationSeconds = entry.duration ?? 1800;
        await createTimeEntryMutation.mutateAsync({
          billable: entry.billable,
          description: description.trim(),
          duration: durationSeconds > 0 ? durationSeconds : 1800,
          projectId,
          start: entry.start ?? toTrackIso(new Date()),
          stop: entry.stop ?? toTrackIso(new Date()),
          tagIds,
          taskId: entry.task_id ?? entry.tid ?? null,
        });
        setError(null);
        onClose();
      } catch (err) {
        setError(resolveSingleTimerErrorMessage(err));
      }
      return;
    }

    if (!entry.id) return;
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof wid !== "number") {
      setError("This time entry is missing a workspace and cannot be updated.");
      return;
    }
    setError(null);
    onClose();
    updateTimeEntryMutation.mutate(
      {
        request: {
          billable: entry.billable,
          description: description.trim(),
          projectId,
          start: entry.start,
          stop: entry.stop,
          tagIds,
          taskId: entry.task_id ?? entry.tid,
        },
        timeEntryId: entry.id,
        workspaceId: wid,
      },
      {
        onSuccess: () => toast.success(t("timeEntrySaved")),
        onError: () => toast.error(t("failedToSaveTimeEntry")),
      },
    );
  }, [
    entry,
    description,
    projectId,
    tagIds,
    isNewEntry,
    createTimeEntryMutation,
    updateTimeEntryMutation,
    onClose,
    t,
  ]);

  const deleteEntry = useCallback(async () => {
    if (!entry.id) return;
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof wid !== "number") {
      setError("This time entry is missing a workspace.");
      return;
    }
    try {
      await deleteTimeEntryMutation.mutateAsync({
        timeEntryId: entry.id,
        workspaceId: wid,
      });
      setError(null);
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
      throw err;
    }
  }, [entry, deleteTimeEntryMutation, onClose]);

  const duplicate = useCallback(async () => {
    if (!entry.id) return;
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof wid !== "number") {
      setError("This time entry is missing a workspace.");
      return;
    }
    if (isRunningTimeEntry(entry) || !entry.start || !entry.stop) {
      setError("Only stopped time entries can be duplicated.");
      return;
    }
    try {
      await createTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: description.trim(),
        duration: resolveEntryDurationSeconds(entry),
        projectId,
        start: entry.start,
        stop: entry.stop,
        tagIds,
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      setError(null);
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  }, [entry, description, projectId, tagIds, createTimeEntryMutation, onClose]);

  const favorite = useCallback(async () => {
    try {
      await createWorkspaceFavoriteMutation.mutateAsync({
        billable: entry.billable,
        description: description.trim(),
        projectId,
        tagIds,
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      setError(null);
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  }, [createWorkspaceFavoriteMutation, description, entry, projectId, tagIds]);

  const split = useCallback(
    async (splitAtMs?: number) => {
      if (!entry.id || !entry.start || !entry.stop) {
        setError("Only stopped time entries can be split.");
        return;
      }
      const wid = entry.workspace_id ?? entry.wid;
      if (typeof wid !== "number") {
        setError("This time entry is missing a workspace.");
        return;
      }
      const startMs = new Date(entry.start).getTime();
      const stopMs = new Date(entry.stop).getTime();
      const resolvedSplitMs = splitAtMs ?? startMs + Math.floor((stopMs - startMs) / 2);
      if (
        !Number.isFinite(resolvedSplitMs) ||
        resolvedSplitMs <= startMs ||
        resolvedSplitMs >= stopMs
      ) {
        setError("This time entry is too short to split.");
        return;
      }
      try {
        await updateTimeEntryMutation.mutateAsync({
          request: {
            billable: entry.billable,
            description: description.trim(),
            projectId,
            start: entry.start,
            stop: new Date(resolvedSplitMs).toISOString(),
            tagIds,
            taskId: entry.task_id ?? entry.tid ?? null,
          },
          timeEntryId: entry.id,
          workspaceId: wid,
        });
        await createTimeEntryMutation.mutateAsync({
          billable: entry.billable,
          description: description.trim(),
          duration: Math.round((stopMs - resolvedSplitMs) / 1000),
          projectId,
          start: new Date(resolvedSplitMs).toISOString(),
          stop: entry.stop,
          tagIds,
          taskId: entry.task_id ?? entry.tid ?? null,
        });
        setError(null);
        onClose();
      } catch (err) {
        setError(resolveSingleTimerErrorMessage(err));
      }
    },
    [
      entry,
      description,
      projectId,
      tagIds,
      createTimeEntryMutation,
      updateTimeEntryMutation,
      onClose,
    ],
  );

  const createProject = useCallback(
    async (name: string, color?: string) => {
      try {
        const project = await createProjectMutation.mutateAsync({ color, name });
        setProjectId(project.id ?? null);
        setError(null);
      } catch (err) {
        setError(resolveSingleTimerErrorMessage(err));
        throw err;
      }
    },
    [createProjectMutation],
  );

  const createTag = useCallback(
    async (name: string) => {
      try {
        await createTagMutation.mutateAsync(name);
        setError(null);
      } catch (err) {
        setError(resolveSingleTimerErrorMessage(err));
        throw err;
      }
    },
    [createTagMutation],
  );

  const toggleBillable = useCallback(() => {
    setEntry((current) => ({ ...current, billable: current.billable !== true }));
  }, []);

  const changeStartTime = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setEntry((current) => ({ ...current, start: nextIso }));
  }, []);

  const changeStopTime = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setEntry((current) => ({ ...current, stop: nextIso }));
  }, []);

  const selectSuggestion = useCallback(
    (suggestionEntry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      setDescription(suggestionEntry.description ?? "");
      setProjectId(resolveTimeEntryProjectId(suggestionEntry));
      setTagIds(suggestionEntry.tag_ids ?? []);
    },
    [],
  );

  const primaryAction = useCallback(async () => {
    if (!entry.id) return;
    const wid = entry.workspace_id ?? entry.wid;
    if (typeof wid !== "number") {
      setError("This time entry is missing a workspace.");
      return;
    }
    try {
      if (isRunningTimeEntry(entry)) {
        await stopTimeEntryMutation.mutateAsync({ timeEntryId: entry.id, workspaceId: wid });
        setError(null);
        onClose();
        return;
      }
      await startTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: description.trim() || (entry.description ?? ""),
        projectId,
        start: new Date().toISOString(),
        tagIds,
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  }, [
    entry,
    description,
    projectId,
    tagIds,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    onClose,
  ]);

  return {
    description,
    setDescription,
    projectId,
    setProjectId,
    tagIds,
    setTagIds,
    error,
    isDirty,
    isNewEntry,
    entry,
    projects,
    tags,
    recentEntries,
    workspaceId: entryWorkspaceId,
    timezone,
    isSaving,
    isCreatingProject,
    isCreatingTag,
    isDeleting,
    isPrimaryActionPending,
    primaryActionIcon,
    primaryActionLabel,
    save,
    deleteEntry,
    duplicate,
    favorite,
    split,
    createProject,
    createTag,
    toggleBillable,
    changeStartTime,
    changeStopTime,
    selectSuggestion,
    primaryAction,
    close,
    discard,
  };
}
