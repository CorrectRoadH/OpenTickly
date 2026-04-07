import { useEffect, useState } from "react";
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
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useUpdateTimeEntryMutation,
} from "../../shared/query/web-shell.ts";
import { resolveEntryDurationSeconds } from "./overview-data.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { TimeEntryEditorProject, TimeEntryEditorTag } from "./TimeEntryEditorDialog.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { normalizeTags } from "./useWorkspaceData.ts";

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
  taskId: number | null;
  setTaskId: (id: number | null) => void;
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
  options: {
    currentWorkspaceId: number;
    initialProjects: TimeEntryEditorProject[];
    initialRecentEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
    initialTags: TimeEntryEditorTag[];
    timezone: string;
  },
): TimeEntryEditorState {
  const { t } = useTranslation("toast");
  const { t: tTracking } = useTranslation("tracking");
  const { currentWorkspaceId, initialProjects, initialRecentEntries, initialTags, timezone } =
    options;

  // Entry state — we keep a mutable copy so time edits update in place
  const [entry, setEntry] = useState(initialEntry);
  const [isNewEntry] = useState(isNew);

  // Field state — initialized from entry
  const [description, setDescription] = useState(initialEntry.description ?? "");
  const [projectId, setProjectIdRaw] = useState<number | null>(
    resolveTimeEntryProjectId(initialEntry),
  );
  const [taskId, setTaskId] = useState<number | null>(
    initialEntry.task_id ?? initialEntry.tid ?? null,
  );
  const [tagIds, setTagIds] = useState<number[]>(initialEntry.tag_ids ?? []);
  const [projects, setProjects] = useState<TimeEntryEditorProject[]>(initialProjects);
  const [tags, setTags] = useState<TimeEntryEditorTag[]>(initialTags);
  const [error, setError] = useState<string | null>(null);

  // Clear task when project changes
  const setProjectId = (id: number | null) => {
    setProjectIdRaw(id);
    setTaskId(null);
  };

  // Sync with external data when it arrives (e.g. after page reload)
  useEffect(() => {
    if (initialProjects.length > 0) setProjects(initialProjects);
  }, [initialProjects]);
  useEffect(() => {
    if (initialTags.length > 0) setTags(initialTags);
  }, [initialTags]);

  // Workspace for queries/mutations
  const entryWorkspaceId = (() => {
    const wid = entry.workspace_id ?? entry.wid;
    return typeof wid === "number" ? wid : currentWorkspaceId;
  })();

  // Dirty check
  const isDirty = (() => {
    const originalProjectId = resolveTimeEntryProjectId(initialEntry);
    const originalTaskId = initialEntry.task_id ?? initialEntry.tid ?? null;
    const originalTagIds = initialEntry.tag_ids ?? [];
    return (
      description !== (initialEntry.description ?? "") ||
      projectId !== originalProjectId ||
      taskId !== originalTaskId ||
      !areNumberListsEqual(tagIds, originalTagIds) ||
      (entry.start ?? null) !== (initialEntry.start ?? null) ||
      (entry.stop ?? null) !== (initialEntry.stop ?? null)
    );
  })();

  // Mutations
  const createProjectMutation = useCreateProjectMutation(entryWorkspaceId);
  const createTimeEntryMutation = useCreateTimeEntryMutation(entryWorkspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(entryWorkspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(currentWorkspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const createTagMutation = useCreateTagMutation(entryWorkspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();

  const recentEntries = initialRecentEntries;

  // Primary action state
  const isRunning = isRunningTimeEntry(entry);
  const isPrimaryActionPending =
    startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;
  const primaryActionIcon = isRunning ? ("stop" as const) : ("play" as const);
  const primaryActionLabel = isRunning ? tTracking("stopTimer") : tTracking("continueTimeEntry");

  // Loading states
  const isSaving = isNewEntry
    ? createTimeEntryMutation.isPending
    : updateTimeEntryMutation.isPending;
  const isCreatingProject = createProjectMutation.isPending;
  const isCreatingTag = createTagMutation.isPending;
  const isDeleting = deleteTimeEntryMutation.isPending;

  // Handlers
  const close = () => {
    onClose();
  };

  const discard = () => {
    onClose();
  };

  const save = async () => {
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
          taskId,
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
    updateTimeEntryMutation
      .mutateAsync({
        request: {
          billable: entry.billable,
          description: description.trim(),
          projectId,
          start: entry.start,
          stop: entry.stop,
          tagIds,
          taskId,
        },
        timeEntryId: entry.id,
        workspaceId: wid,
      })
      .then(() => toast.success(t("timeEntrySaved")))
      .catch(() => toast.error(t("failedToSaveTimeEntry")));
  };

  const deleteEntry = async () => {
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
  };

  const duplicate = async () => {
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
        taskId,
      });
      setError(null);
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  };

  const favorite = async () => {
    try {
      await createWorkspaceFavoriteMutation.mutateAsync({
        billable: entry.billable,
        description: description.trim(),
        projectId,
        tagIds,
        taskId,
      });
      setError(null);
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  };

  const split = async (splitAtMs?: number) => {
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
          taskId,
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
        taskId,
      });
      setError(null);
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  };

  const createProject = async (name: string, color?: string) => {
    try {
      const project = await createProjectMutation.mutateAsync({ color, name });
      if (typeof project.id === "number") {
        const projectId = project.id;
        setProjects((current) =>
          [
            ...current,
            {
              clientName: project.client_name ?? undefined,
              color: resolveProjectColorValue(project),
              id: projectId,
              name: project.name ?? "Untitled project",
              pinned: project.pinned === true,
            },
          ].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
        );
      }
      setProjectId(project.id ?? null);
      setError(null);
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
      throw err;
    }
  };

  const createTag = async (name: string) => {
    try {
      const [tag] = normalizeTags(await createTagMutation.mutateAsync(name));
      if (typeof tag?.id === "number" && typeof tag?.name === "string") {
        setTags((current) => {
          if (current.some((currentTag) => currentTag.id === tag.id)) {
            return current;
          }
          return [...current, { id: tag.id, name: tag.name }];
        });
        setTagIds((current) => (current.includes(tag.id) ? current : [...current, tag.id]));
      }
      setError(null);
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
      throw err;
    }
  };

  const toggleBillable = () => {
    setEntry((current) => ({ ...current, billable: current.billable !== true }));
  };

  const changeStartTime = (time: Date) => {
    const nextIso = time.toISOString();
    setEntry((current) => ({ ...current, start: nextIso }));
  };

  const changeStopTime = (time: Date) => {
    const nextIso = time.toISOString();
    setEntry((current) => ({ ...current, stop: nextIso }));
  };

  const selectSuggestion = (suggestionEntry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
    setDescription(suggestionEntry.description ?? "");
    setProjectId(resolveTimeEntryProjectId(suggestionEntry));
    setTagIds(suggestionEntry.tag_ids ?? []);
  };

  const primaryAction = async () => {
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
        taskId,
      });
      onClose();
    } catch (err) {
      setError(resolveSingleTimerErrorMessage(err));
    }
  };

  return {
    description,
    setDescription,
    projectId,
    setProjectId,
    taskId,
    setTaskId,
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
