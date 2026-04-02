import { useCallback, useEffect, useRef } from "react";

import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCurrentTimeEntryQuery,
  useSearchTimeEntriesQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useUpdateWebSessionMutation,
} from "../../shared/query/web-shell.ts";
import { useTimerViewStore } from "./store/timer-view-store.ts";
import { useWorkspaceData } from "./useWorkspaceData.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";

export function useTimerComposer() {
  const { workspaceId, setCurrentWorkspaceId } = useWorkspaceData();

  // Draft state from Zustand store
  const draftDescription = useTimerViewStore((s) => s.draftDescription);
  const setDraftDescription = useTimerViewStore((s) => s.setDraftDescription);
  const draftProjectId = useTimerViewStore((s) => s.draftProjectId);
  const setDraftProjectId = useTimerViewStore((s) => s.setDraftProjectId);
  const draftTagIds = useTimerViewStore((s) => s.draftTagIds);
  const setDraftTagIds = useTimerViewStore((s) => s.setDraftTagIds);
  const draftBillable = useTimerViewStore((s) => s.draftBillable);
  const setDraftBillable = useTimerViewStore((s) => s.setDraftBillable);
  const runningDescription = useTimerViewStore((s) => s.runningDescription);
  const setRunningDescription = useTimerViewStore((s) => s.setRunningDescription);
  const composerSuggestionsAnchor = useTimerViewStore((s) => s.composerSuggestionsAnchor);
  const setComposerSuggestionsAnchor = useTimerViewStore((s) => s.setComposerSuggestionsAnchor);
  const clearDraft = useTimerViewStore((s) => s.clearDraft);

  // Queries
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data ?? null;

  const timerDescriptionValue = runningEntry?.id != null ? runningDescription : draftDescription;
  const searchQuery = useSearchTimeEntriesQuery(workspaceId, timerDescriptionValue);
  const searchedTimeEntries = searchQuery.data?.entries;

  // Mutations
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();

  const timerMutationPending = startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;

  const timerErrorMessage = (() => {
    const failure = [startTimeEntryMutation.error, stopTimeEntryMutation.error].find(
      (candidate) => candidate instanceof WebApiError,
    );
    if (failure instanceof WebApiError) {
      return failure.message;
    }
    return "We could not load or update time entries right now.";
  })();

  // Ref
  const timerDescriptionInputRef = useRef<HTMLInputElement | null>(null);

  // Sync running description from server
  useEffect(() => {
    setRunningDescription(runningEntry?.description ?? "");
  }, [runningEntry, setRunningDescription]);

  // Clear draft when timer starts running
  useEffect(() => {
    if (!runningEntry) return;
    clearDraft();
  }, [runningEntry, clearDraft]);

  const closeComposerSuggestions = useCallback(() => {
    setComposerSuggestionsAnchor(null);
  }, [setComposerSuggestionsAnchor]);

  const openComposerSuggestions = useCallback(() => {
    if (!timerDescriptionInputRef.current || runningEntry?.id != null) return;
    const anchorRect = timerDescriptionInputRef.current.getBoundingClientRect();
    setComposerSuggestionsAnchor({
      height: anchorRect.height,
      left: anchorRect.left,
      top: anchorRect.top,
      width: anchorRect.width,
    });
  }, [runningEntry, setComposerSuggestionsAnchor]);

  const handleRunningDescriptionCommit = useCallback(async () => {
    if (runningEntry?.id == null) return;
    const runningWorkspaceId = runningEntry.workspace_id ?? runningEntry.wid;
    if (typeof runningWorkspaceId !== "number") return;
    const nextDescription = runningDescription.trim();
    const currentDescription = (runningEntry.description ?? "").trim();
    if (nextDescription === currentDescription) return;
    try {
      await updateTimeEntryMutation.mutateAsync({
        request: { description: nextDescription },
        timeEntryId: runningEntry.id,
        workspaceId: runningWorkspaceId,
      });
    } catch {
      // Keep the local draft so the user can retry without losing their change.
    }
  }, [runningEntry, runningDescription, updateTimeEntryMutation]);

  const handleTimerAction = useCallback(async () => {
    if (runningEntry?.id != null) {
      const runningWorkspaceId = runningEntry.workspace_id ?? runningEntry.wid;
      if (typeof runningWorkspaceId === "number") {
        await stopTimeEntryMutation.mutateAsync({
          timeEntryId: runningEntry.id,
          workspaceId: runningWorkspaceId,
        });
      }
      return;
    }
    const descriptionToStart = draftDescription.trim();
    await startTimeEntryMutation.mutateAsync({
      billable: draftBillable,
      description: descriptionToStart,
      projectId: draftProjectId,
      start: new Date().toISOString(),
      tagIds: draftTagIds,
    });
    setRunningDescription(descriptionToStart);
    clearDraft();
  }, [
    runningEntry,
    draftBillable,
    draftDescription,
    draftProjectId,
    draftTagIds,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    setRunningDescription,
    clearDraft,
  ]);

  const handleContinueEntry = useCallback(
    async (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      const continuedDescription = (entry.description ?? "").trim();
      await startTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: continuedDescription,
        projectId: resolveTimeEntryProjectId(entry),
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      setRunningDescription(continuedDescription);
    },
    [startTimeEntryMutation, setRunningDescription],
  );

  const handleStartFromUrl = useCallback(
    async (params: {
      description?: string;
      projectId?: number;
      tagIds?: number[];
      billable?: boolean;
    }) => {
      if (runningEntry?.id != null) return;
      const desc = (params.description ?? "").trim();
      await startTimeEntryMutation.mutateAsync({
        billable: params.billable,
        description: desc,
        projectId: params.projectId ?? null,
        start: new Date().toISOString(),
        tagIds: params.tagIds ?? [],
      });
      setRunningDescription(desc);
    },
    [runningEntry, startTimeEntryMutation, setRunningDescription],
  );

  const handleIdleDescriptionFocus = useCallback(() => {
    if (runningEntry?.id != null) return;
    if (draftProjectId != null || draftTagIds.length > 0) return;
    openComposerSuggestions();
  }, [runningEntry, draftProjectId, draftTagIds, openComposerSuggestions]);

  const switchWorkspace = useCallback(
    (nextWorkspaceId: number) => {
      const previousWorkspaceId = workspaceId;
      setCurrentWorkspaceId(nextWorkspaceId);
      void updateWebSessionMutation.mutateAsync({ workspace_id: nextWorkspaceId }).catch(() => {
        setCurrentWorkspaceId(previousWorkspaceId);
      });
    },
    [workspaceId, setCurrentWorkspaceId, updateWebSessionMutation],
  );

  return {
    // State
    currentTimeEntryQuery,
    runningEntry,
    runningDescription,
    setRunningDescription,
    draftDescription,
    setDraftDescription,
    draftProjectId,
    setDraftProjectId,
    draftTagIds,
    setDraftTagIds,
    draftBillable,
    setDraftBillable,
    timerDescriptionValue,
    composerSuggestionsAnchor,
    setComposerSuggestionsAnchor,
    searchedTimeEntries,
    timerMutationPending,
    timerErrorMessage,
    timerDescriptionInputRef,

    // Mutations (exposed for inline use)
    updateTimeEntryMutation,

    // Handlers
    handleTimerAction,
    handleRunningDescriptionCommit,
    handleContinueEntry,
    handleStartFromUrl,
    handleIdleDescriptionFocus,
    closeComposerSuggestions,
    switchWorkspace,
  };
}
