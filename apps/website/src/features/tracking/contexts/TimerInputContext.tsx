import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useSearchTimeEntriesQuery } from "../../../shared/query/web-shell.ts";
import type { TimeEntrySearchItem } from "../../../shared/api/generated/web/types.gen.ts";
import { resolveEntryColor } from "../overview-data.ts";
import { resolveProjectColorValue } from "../../../shared/lib/project-colors.ts";
import type { TimerComposerSuggestionsAnchor } from "../TimerComposerSuggestionsDialog.tsx";
import { useWorkspaceContext } from "./WorkspaceContext.tsx";
import { useRunningTimerContext } from "./RunningTimerContext.tsx";
import { useTimeEntriesContext } from "./TimeEntriesContext.tsx";

export interface TimerInputContextValue {
  draftDescription: string;
  setDraftDescription: (desc: string) => void;
  draftProjectId: number | null;
  setDraftProjectId: (id: number | null) => void;
  draftTagIds: number[];
  setDraftTagIds: (ids: number[]) => void;
  draftBillable: boolean;
  setDraftBillable: (billable: boolean) => void;
  draftTags: { id: number; name: string }[];

  runningDescription: string;
  setRunningDescription: (desc: string) => void;

  timerDescriptionValue: string;
  displayProject: string;
  displayColor: string;

  searchedTimeEntries: TimeEntrySearchItem[] | undefined;

  composerSuggestionsAnchor: TimerComposerSuggestionsAnchor | null;
  setComposerSuggestionsAnchor: (anchor: TimerComposerSuggestionsAnchor | null) => void;

  timerDescriptionInputRef: React.RefObject<HTMLInputElement | null>;

  handleTimerAction: () => Promise<void>;
  handleRunningDescriptionCommit: () => Promise<void>;
  handleIdleDescriptionFocus: () => void;
  closeComposerSuggestions: () => void;
}

const TimerInputCtx = createContext<TimerInputContextValue | null>(null);

export function TimerInputProvider({ children }: { children: ReactNode }) {
  const {
    workspaceId,
    projectOptions,
    tagOptions,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    updateTimeEntryMutation,
  } = useWorkspaceContext();
  const { runningEntry } = useRunningTimerContext();
  const { visibleEntries } = useTimeEntriesContext();

  const [draftDescription, setDraftDescription] = useState("");
  const [draftProjectId, setDraftProjectId] = useState<number | null>(null);
  const [draftTagIds, setDraftTagIds] = useState<number[]>([]);
  const [draftBillable, setDraftBillable] = useState(false);
  const [runningDescription, setRunningDescription] = useState("");
  const [composerSuggestionsAnchor, setComposerSuggestionsAnchor] =
    useState<TimerComposerSuggestionsAnchor | null>(null);

  const timerDescriptionInputRef = useRef<HTMLInputElement | null>(null);

  const draftProject = useMemo(
    () => projectOptions.find((project) => project.id === draftProjectId) ?? null,
    [draftProjectId, projectOptions],
  );
  const draftTags = useMemo(
    () => tagOptions.filter((tag) => draftTagIds.includes(tag.id)),
    [draftTagIds, tagOptions],
  );

  const timerDescriptionValue = runningEntry?.id != null ? runningDescription : draftDescription;

  const searchQuery = useSearchTimeEntriesQuery(workspaceId, timerDescriptionValue);
  const searchedTimeEntries = searchQuery.data?.entries;

  const displayProject = useMemo(
    () =>
      runningEntry?.project_name ||
      draftProject?.name ||
      visibleEntries.find((entry) => entry.project_name)?.project_name ||
      "No project",
    [runningEntry, draftProject, visibleEntries],
  );

  const displayColor = useMemo(
    () =>
      runningEntry != null
        ? resolveEntryColor(runningEntry)
        : draftProject != null
          ? resolveProjectColorValue(draftProject)
          : resolveEntryColor(visibleEntries[0] ?? {}),
    [runningEntry, draftProject, visibleEntries],
  );

  // Sync running description from server data
  useEffect(() => {
    setRunningDescription(runningEntry?.description ?? "");
  }, [runningEntry]);

  // Clear draft state when a timer starts
  useEffect(() => {
    if (!runningEntry) return;
    setDraftDescription("");
    setDraftProjectId(null);
    setDraftTagIds([]);
    setDraftBillable(false);
    setComposerSuggestionsAnchor(null);
  }, [runningEntry]);

  const closeComposerSuggestions = useCallback(() => {
    setComposerSuggestionsAnchor(null);
  }, []);

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
      // Keep the local draft so the user can retry
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
    setDraftDescription("");
    setDraftProjectId(null);
    setDraftTagIds([]);
    setDraftBillable(false);
    closeComposerSuggestions();
  }, [
    runningEntry,
    draftBillable,
    draftDescription,
    draftProjectId,
    draftTagIds,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    closeComposerSuggestions,
  ]);

  const openComposerSuggestions = useCallback(() => {
    if (!timerDescriptionInputRef.current || runningEntry?.id != null) return;
    const anchorRect = timerDescriptionInputRef.current.getBoundingClientRect();
    setComposerSuggestionsAnchor({
      height: anchorRect.height,
      left: anchorRect.left,
      top: anchorRect.top,
      width: anchorRect.width,
    });
  }, [runningEntry]);

  const handleIdleDescriptionFocus = useCallback(() => {
    if (runningEntry?.id != null) return;
    if (draftProjectId != null || draftTagIds.length > 0) return;
    openComposerSuggestions();
  }, [runningEntry, draftProjectId, draftTagIds, openComposerSuggestions]);

  const value = useMemo<TimerInputContextValue>(
    () => ({
      draftDescription,
      setDraftDescription,
      draftProjectId,
      setDraftProjectId,
      draftTagIds,
      setDraftTagIds,
      draftBillable,
      setDraftBillable,
      draftTags,
      runningDescription,
      setRunningDescription,
      timerDescriptionValue,
      displayProject,
      displayColor,
      searchedTimeEntries,
      composerSuggestionsAnchor,
      setComposerSuggestionsAnchor,
      timerDescriptionInputRef,
      handleTimerAction,
      handleRunningDescriptionCommit,
      handleIdleDescriptionFocus,
      closeComposerSuggestions,
    }),
    [
      draftDescription,
      draftProjectId,
      draftTagIds,
      draftBillable,
      draftTags,
      runningDescription,
      timerDescriptionValue,
      displayProject,
      displayColor,
      searchedTimeEntries,
      composerSuggestionsAnchor,
      handleTimerAction,
      handleRunningDescriptionCommit,
      handleIdleDescriptionFocus,
      closeComposerSuggestions,
    ],
  );

  return <TimerInputCtx.Provider value={value}>{children}</TimerInputCtx.Provider>;
}

export function useTimerInputContext(): TimerInputContextValue {
  const ctx = useContext(TimerInputCtx);
  if (!ctx) {
    throw new Error("TimerInputProvider is required");
  }
  return ctx;
}
