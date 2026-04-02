import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../../shared/api/generated/public-track/types.gen.ts";
import { WebApiError } from "../../../shared/api/web-client.ts";
import { useCurrentTimeEntryQuery } from "../../../shared/query/web-shell.ts";
import { resolveEntryDurationSeconds } from "../overview-data.ts";
import { resolveTimeEntryProjectId } from "../time-entry-ids.ts";
import { useWorkspaceContext } from "./WorkspaceContext.tsx";

export interface RunningTimerContextValue {
  nowMs: number;
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  runningDurationSeconds: number;
  currentTimeEntryQuery: ReturnType<typeof useCurrentTimeEntryQuery>;
  timerMutationPending: boolean;
  timerErrorMessage: string;

  handleContinueEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => Promise<void>;
  handleStartFromUrl: (params: {
    description?: string;
    projectId?: number;
    tagIds?: number[];
    billable?: boolean;
  }) => Promise<void>;
}

const RunningTimerCtx = createContext<RunningTimerContextValue | null>(null);

export function RunningTimerProvider({ children }: { children: ReactNode }) {
  const { startTimeEntryMutation, stopTimeEntryMutation } = useWorkspaceContext();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data ?? null;

  useEffect(() => {
    if (!runningEntry) return;
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningEntry]);

  const runningDurationSeconds = useMemo(
    () => resolveEntryDurationSeconds(runningEntry ?? { duration: 0 }, nowMs),
    [runningEntry, nowMs],
  );

  const timerMutationPending = startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;

  const timerErrorMessage = useMemo(() => {
    const failure = [startTimeEntryMutation.error, stopTimeEntryMutation.error].find(
      (candidate) => candidate instanceof WebApiError,
    );
    if (failure instanceof WebApiError) {
      return failure.message;
    }
    return "We could not load or update time entries right now.";
  }, [startTimeEntryMutation.error, stopTimeEntryMutation.error]);

  const handleContinueEntry = useCallback(
    async (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      await startTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        projectId: resolveTimeEntryProjectId(entry),
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
    },
    [startTimeEntryMutation],
  );

  const handleStartFromUrl = useCallback(
    async (params: {
      description?: string;
      projectId?: number;
      tagIds?: number[];
      billable?: boolean;
    }) => {
      if (runningEntry?.id != null) return;
      await startTimeEntryMutation.mutateAsync({
        billable: params.billable,
        description: (params.description ?? "").trim(),
        projectId: params.projectId ?? null,
        start: new Date().toISOString(),
        tagIds: params.tagIds ?? [],
      });
    },
    [runningEntry, startTimeEntryMutation],
  );

  const value = useMemo<RunningTimerContextValue>(
    () => ({
      nowMs,
      runningEntry,
      runningDurationSeconds,
      currentTimeEntryQuery,
      timerMutationPending,
      timerErrorMessage,
      handleContinueEntry,
      handleStartFromUrl,
    }),
    [
      nowMs,
      runningEntry,
      runningDurationSeconds,
      currentTimeEntryQuery,
      timerMutationPending,
      timerErrorMessage,
      handleContinueEntry,
      handleStartFromUrl,
    ],
  );

  return <RunningTimerCtx.Provider value={value}>{children}</RunningTimerCtx.Provider>;
}

export function useRunningTimerContext(): RunningTimerContextValue {
  const ctx = useContext(RunningTimerCtx);
  if (!ctx) {
    throw new Error("RunningTimerProvider is required");
  }
  return ctx;
}
