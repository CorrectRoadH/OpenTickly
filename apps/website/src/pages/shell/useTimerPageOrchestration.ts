import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildEntryGroups,
  buildTimesheetRows,
  collapseSimilarEntries,
  formatDateKey,
  getCalendarHours,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  sortTimeEntries,
  summarizeProjects,
  sumForDate,
} from "../../features/tracking/overview-data.ts";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult, WebApiError } from "../../shared/api/web-client.ts";
import {
  useBulkDeleteTimeEntriesMutation,
  useBulkEditTimeEntriesMutation,
  useCreateWorkspaceFavoriteMutation,
  useCreateProjectMutation,
  useCreateTagMutation,
  useCreateTimeEntryMutation,
  useCurrentTimeEntryQuery,
  useDeleteTimeEntryMutation,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTagsQuery,
  useTimeEntriesQuery,
  useSearchTimeEntriesQuery,
  useUpdateTimeEntryMutation,
  useUpdateWebSessionMutation,
} from "../../shared/query/web-shell.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import type { BulkEditUpdates } from "../../features/tracking/BulkEditDialog.tsx";
import type { TimeEntryEditorAnchor } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import type { TimerComposerSuggestionsAnchor } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import { resolveTimeEntryProjectId } from "../../features/tracking/time-entry-ids.ts";
import type {
  CalendarSubview,
  TimerInputMode,
  TimerViewMode,
} from "../../features/tracking/timer-view-mode.ts";
import { useTimerViewStore } from "../../features/tracking/store/timer-view-store.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "../../features/tracking/week-range.ts";
import { getTimeEntries } from "../../shared/api/public/track/index.ts";
import { useNowMs } from "../../shared/hooks/useNowMs.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { useSession, useSessionActions } from "../../shared/session/session-context.tsx";

function toTrackIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data.filter((project): project is GithubComTogglTogglApiInternalModelsProject =>
      Boolean(project && typeof project === "object" && "id" in project),
    );
  }
  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }
  if (hasProjectArray(data, "data")) {
    return data.data;
  }
  return [];
}

function hasProjectArray(
  value: unknown,
  key: "data" | "projects",
): value is Record<typeof key, GithubComTogglTogglApiInternalModelsProject[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

function normalizeTags(data: unknown): { id: number; name: string }[] {
  if (Array.isArray(data)) {
    return data.filter((tag): tag is { id: number; name: string } =>
      Boolean(tag && typeof tag === "object" && "id" in tag && "name" in tag),
    );
  }
  if (hasTagArray(data, "tags")) {
    return data.tags;
  }
  if (hasTagArray(data, "data")) {
    return data.data;
  }
  return [];
}

function hasTagArray(
  value: unknown,
  key: "data" | "tags",
): value is Record<typeof key, { id: number; name: string }[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

export interface TimerPageOrchestration {
  // View state
  view: TimerViewMode;
  setView: (next: TimerViewMode) => void;
  calendarSubview: CalendarSubview;
  setCalendarSubview: (next: CalendarSubview) => void;
  timerInputMode: TimerInputMode;
  setTimerInputMode: (next: TimerInputMode) => void;
  calendarZoom: number;
  setCalendarZoom: (zoom: number) => void;
  listDateRange: { startDate: string; endDate: string } | null;
  setListDateRange: (range: { startDate: string; endDate: string } | null) => void;

  // Time state
  nowMs: number;
  selectedWeekDate: Date;
  setSelectedWeekDate: (date: Date) => void;
  beginningOfWeek: number;
  weekDays: Date[];
  weekRange: { endDate: string; startDate: string };

  // Running entry state
  runningEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  runningDurationSeconds: number;
  runningDescription: string;
  setRunningDescription: (desc: string) => void;

  // Draft state for idle composer
  draftDescription: string;
  setDraftDescription: (desc: string) => void;
  draftProjectId: number | null;
  setDraftProjectId: (id: number | null) => void;
  draftTagIds: number[];
  setDraftTagIds: (ids: number[]) => void;
  draftBillable: boolean;
  setDraftBillable: (billable: boolean) => void;
  draftTags: { id: number; name: string }[];

  // Display values derived from state
  displayProject: string;
  displayColor: string;
  timerDescriptionValue: string;

  // Selected entry state for popup
  selectedEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  setSelectedEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry | null) => void;
  selectedEntryAnchor: TimeEntryEditorAnchor | null;
  setSelectedEntryAnchor: (anchor: TimeEntryEditorAnchor | null) => void;
  isNewEntry: boolean;
  calendarDraftEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;

  // Composer suggestions
  composerSuggestionsAnchor: TimerComposerSuggestionsAnchor | null;
  setComposerSuggestionsAnchor: (anchor: TimerComposerSuggestionsAnchor | null) => void;

  // Refs
  timerDescriptionInputRef: React.RefObject<HTMLInputElement | null>;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;

  // Query data
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  visibleEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  timeEntriesQuery: ReturnType<typeof useTimeEntriesQuery>;
  currentTimeEntryQuery: ReturnType<typeof useCurrentTimeEntryQuery>;
  recentWorkspaceEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  searchedTimeEntries:
    | import("../../shared/api/generated/web/types.gen.ts").TimeEntrySearchItem[]
    | undefined;
  projectOptions: GithubComTogglTogglApiInternalModelsProject[];
  tagOptions: { id: number; name: string }[];
  workspaceId: number;
  timezone: string;
  todayTotalSeconds: number;
  weekTotalSeconds: number;
  groupedEntries: ReturnType<typeof buildEntryGroups>;
  trackStrip: { color: string; label: string; totalSeconds: number }[];
  calendarHours: ReturnType<typeof getCalendarHours>;
  timesheetRows: ReturnType<typeof buildTimesheetRows>;

  // Pagination
  hasMoreEntries: boolean;
  isLoadingMoreEntries: boolean;
  loadMoreEntries: () => void;

  // Mutation states
  timerMutationPending: boolean;
  timerErrorMessage: string;

  // Bulk action handlers
  handleBulkEdit: (ids: number[], updates: BulkEditUpdates) => Promise<void>;
  handleBulkDelete: (ids: number[]) => Promise<void>;

  // Handlers
  handleTimerAction: () => Promise<void>;
  handleRunningDescriptionCommit: () => Promise<void>;
  handleContinueEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => Promise<void>;
  handleStartFromUrl: (params: {
    description?: string;
    projectId?: number;
    tagIds?: number[];
    billable?: boolean;
  }) => Promise<void>;
  handleCalendarSlotCreate: (slot: { end: Date; start: Date }) => void;
  handleCalendarEntryMove: (entryId: number, minutesDelta: number) => Promise<void>;
  handleCalendarEntryResize: (
    entryId: number,
    edge: "start" | "end",
    minutesDelta: number,
  ) => Promise<void>;
  handleCopyLastWeek: () => Promise<void>;
  handleTimesheetCellEdit: (
    projectLabel: string,
    dayIndex: number,
    durationSeconds: number,
  ) => Promise<void>;
  handleEntryEdit: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    anchorRect: DOMRect,
  ) => void;
  handleIdleDescriptionFocus: () => void;
  closeSelectedEntryEditor: () => void;
  closeComposerSuggestions: () => void;
  switchWorkspace: (nextWorkspaceId: number) => void;

  // Query mutations for dialog
  createProjectMutation: ReturnType<typeof useCreateProjectMutation>;
  createTagMutation: ReturnType<typeof useCreateTagMutation>;
  createWorkspaceFavoriteMutation: ReturnType<typeof useCreateWorkspaceFavoriteMutation>;
  deleteTimeEntryMutation: ReturnType<typeof useDeleteTimeEntryMutation>;
  createTimeEntryMutation: ReturnType<typeof useCreateTimeEntryMutation>;
  updateTimeEntryMutation: ReturnType<typeof useUpdateTimeEntryMutation>;

  // Session
  session: ReturnType<typeof useSession>;
}

export function useTimerPageOrchestration(options?: {
  initialDate?: Date;
  showAllEntries?: boolean;
}): TimerPageOrchestration {
  const showAllEntries = options?.showAllEntries ?? false;
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const updateWebSessionMutation = useUpdateWebSessionMutation();
  const workspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";

  // View state — sourced from Zustand store (fine-grained subscriptions)
  const view = useTimerViewStore((s) => s.view);
  const setView = useTimerViewStore((s) => s.setView);
  const calendarSubview = useTimerViewStore((s) => s.calendarSubview);
  const setCalendarSubview = useTimerViewStore((s) => s.setCalendarSubview);
  const timerInputMode = useTimerViewStore((s) => s.timerInputMode);
  const setTimerInputMode = useTimerViewStore((s) => s.setTimerInputMode);
  const calendarZoom = useTimerViewStore((s) => s.calendarZoom);
  const setCalendarZoom = useTimerViewStore((s) => s.setCalendarZoom);
  const selectedWeekDate = useTimerViewStore((s) => s.selectedWeekDate);
  const setSelectedWeekDate = useTimerViewStore((s) => s.setSelectedWeekDate);
  const listDateRange = useTimerViewStore((s) => s.listDateRange);
  const setListDateRange = useTimerViewStore((s) => s.setListDateRange);

  // Apply initialDate if provided (e.g. from URL params)
  useEffect(() => {
    if (options?.initialDate) {
      setSelectedWeekDate(options.initialDate);
    }
  }, [options?.initialDate, setSelectedWeekDate]);

  // List view pagination: number of days to fetch backwards from today.
  // Toggl API returns ~9 days by default; "Load more" extends by 7 days each time.
  const LIST_INITIAL_DAYS = 9;
  const LIST_PAGE_INCREMENT = 7;
  const [listDaysLoaded, setListDaysLoaded] = useState(LIST_INITIAL_DAYS);

  const listQueryRange = useMemo(() => {
    if (listDateRange) return listDateRange;
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - listDaysLoaded);
    return {
      endDate: formatTrackQueryDate(end),
      startDate: formatTrackQueryDate(start),
    };
  }, [listDateRange, listDaysLoaded]);

  const loadMoreEntries = useCallback(() => {
    setListDaysLoaded((prev) => prev + LIST_PAGE_INCREMENT);
  }, []);

  // Time state
  const nowMs = useNowMs();

  // Preferences
  const { beginningOfWeek, collapseTimeEntries } = useUserPreferences();

  const weekDays = useMemo(
    () => getWeekDaysForDate(selectedWeekDate, beginningOfWeek),
    [selectedWeekDate, beginningOfWeek],
  );

  const weekRange = useMemo(
    () => ({
      endDate: formatTrackQueryDate(weekDays[6]),
      startDate: formatTrackQueryDate(weekDays[0]),
    }),
    [weekDays],
  );

  // Queries — list view uses listQueryRange (computed from listDaysLoaded or listDateRange);
  // other views always use the selected week range.
  const timeEntriesQuery = useTimeEntriesQuery(view === "list" ? listQueryRange : { ...weekRange });
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();

  // Running entry state
  const runningEntry = currentTimeEntryQuery.data ?? null;

  // Draft state for idle composer
  const [draftDescription, setDraftDescription] = useState("");
  const [draftProjectId, setDraftProjectId] = useState<number | null>(null);
  const [draftTagIds, setDraftTagIds] = useState<number[]>([]);
  const [draftBillable, setDraftBillable] = useState(false);

  // Running description state
  const [runningDescription, setRunningDescription] = useState("");

  // Selected entry state for popup
  const [selectedEntry, setSelectedEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);
  const [selectedEntryAnchor, setSelectedEntryAnchor] = useState<TimeEntryEditorAnchor | null>(
    null,
  );
  const [isNewEntry, setIsNewEntry] = useState(false);

  // Composer suggestions
  const [composerSuggestionsAnchor, setComposerSuggestionsAnchor] =
    useState<TimerComposerSuggestionsAnchor | null>(null);

  // Refs
  const timerDescriptionInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Workspace-scoped queries
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const tagsQuery = useTagsQuery(workspaceId);
  const recentTimeEntriesQuery = useTimeEntriesQuery({});

  // Mutations
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const createWorkspaceFavoriteMutation = useCreateWorkspaceFavoriteMutation(workspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const createTagMutation = useCreateTagMutation(workspaceId);
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const bulkEditMutation = useBulkEditTimeEntriesMutation(workspaceId);
  const bulkDeleteMutation = useBulkDeleteTimeEntriesMutation(workspaceId);

  // Normalized data
  const projectOptions = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
  const tagOptions = useMemo(() => normalizeTags(tagsQuery.data), [tagsQuery.data]);

  // Draft project and tags
  const draftProject = useMemo(
    () => projectOptions.find((project) => project.id === draftProjectId) ?? null,
    [draftProjectId, projectOptions],
  );
  const draftTags = useMemo(
    () => tagOptions.filter((tag) => draftTagIds.includes(tag.id)),
    [draftTagIds, tagOptions],
  );

  // Entries
  const entries = useMemo(
    () => sortTimeEntries(timeEntriesQuery.data ?? []),
    [timeEntriesQuery.data],
  );
  const visibleEntries = useMemo(
    () =>
      showAllEntries
        ? entries
        : entries.filter((entry) => (entry.workspace_id ?? entry.wid) === workspaceId),
    [entries, showAllEntries, workspaceId],
  );
  const recentWorkspaceEntries = useMemo(
    () =>
      sortTimeEntries(recentTimeEntriesQuery.data ?? []).filter(
        (entry) => (entry.workspace_id ?? entry.wid) === workspaceId,
      ),
    [recentTimeEntriesQuery.data, workspaceId],
  );
  // Pagination: always allow "Load more" in default (all dates) mode;
  // disabled when a custom date range is explicitly set.
  const hasMoreEntries = listDateRange === null;
  const isLoadingMoreEntries = timeEntriesQuery.isFetching && listDaysLoaded > LIST_INITIAL_DAYS;

  // Computed values
  const runningDurationSeconds = useMemo(
    () => resolveEntryDurationSeconds(runningEntry ?? { duration: 0 }, nowMs),
    [runningEntry, nowMs],
  );

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

  const timerDescriptionValue = runningEntry?.id != null ? runningDescription : draftDescription;

  const searchQuery = useSearchTimeEntriesQuery(workspaceId, timerDescriptionValue);
  const searchedTimeEntries = searchQuery.data?.entries;

  // Today total
  const todayTotalSeconds = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    const todayKey = dateFormatter.format(new Date());
    return sumForDate(visibleEntries, todayKey, timezone);
  }, [visibleEntries, timezone]);

  // Week total
  const weekTotalSeconds = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    return weekDays.reduce((total, day) => {
      return total + sumForDate(visibleEntries, dateFormatter.format(day), timezone);
    }, 0);
  }, [weekDays, visibleEntries, timezone]);

  const groupedEntries = useMemo(() => {
    const groups = buildEntryGroups(visibleEntries, timezone);
    return collapseTimeEntries ? collapseSimilarEntries(groups) : groups;
  }, [visibleEntries, timezone, collapseTimeEntries]);

  const trackStrip = useMemo(
    () => summarizeProjects(visibleEntries).slice(0, 12),
    [visibleEntries],
  );

  const calendarHours = useMemo(
    () => getCalendarHours(visibleEntries, weekDays, timezone),
    [visibleEntries, weekDays, timezone],
  );

  const timesheetRows = useMemo(
    () => buildTimesheetRows(visibleEntries, weekDays, timezone).slice(0, 18),
    [visibleEntries, weekDays, timezone],
  );

  const timerMutationPending = startTimeEntryMutation.isPending || stopTimeEntryMutation.isPending;

  const timerErrorMessage = useMemo(() => {
    const failure = [
      startTimeEntryMutation.error,
      stopTimeEntryMutation.error,
      timeEntriesQuery.error,
    ].find((candidate) => candidate instanceof WebApiError);
    if (failure instanceof WebApiError) {
      return failure.message;
    }
    return "We could not load or update time entries right now.";
  }, [startTimeEntryMutation.error, stopTimeEntryMutation.error, timeEntriesQuery.error]);

  // Effects
  useEffect(() => {
    setRunningDescription(runningEntry?.description ?? "");
  }, [runningEntry]);

  useEffect(() => {
    if (!runningEntry) {
      return;
    }
    setDraftDescription("");
    setDraftProjectId(null);
    setDraftTagIds([]);
    setDraftBillable(false);
    closeComposerSuggestions();
  }, [runningEntry]);

  // Handlers
  const closeSelectedEntryEditor = useCallback(() => {
    setSelectedEntry(null);
    setSelectedEntryAnchor(null);
    setIsNewEntry(false);
    setCalendarDraftEntry(null);
  }, []);

  const closeComposerSuggestions = useCallback(() => {
    setComposerSuggestionsAnchor(null);
  }, []);

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

  const handleRunningDescriptionCommit = useCallback(async () => {
    if (runningEntry?.id == null) {
      return;
    }
    const runningWorkspaceId = runningEntry.workspace_id ?? runningEntry.wid;
    if (typeof runningWorkspaceId !== "number") {
      return;
    }
    const nextDescription = runningDescription.trim();
    const currentDescription = (runningEntry.description ?? "").trim();
    if (nextDescription === currentDescription) {
      return;
    }
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
    // Seed runningDescription immediately so the timer bar shows the
    // description without waiting for the currentTimeEntry query to refetch.
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
    [startTimeEntryMutation],
  );

  const handleStartFromUrl = useCallback(
    async (params: {
      description?: string;
      projectId?: number;
      tagIds?: number[];
      billable?: boolean;
    }) => {
      // Don't start if already running
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
    [runningEntry, startTimeEntryMutation],
  );

  const handleCalendarEntryMove = useCallback(
    async (entryId: number, minutesDelta: number) => {
      if (minutesDelta === 0) {
        return;
      }

      const targetEntry = visibleEntries.find((entry) => entry.id === entryId);
      if (!targetEntry?.start) {
        return;
      }

      const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
      if (typeof workspaceForEntry !== "number") {
        return;
      }

      const nextStart = new Date(new Date(targetEntry.start).getTime() + minutesDelta * 60_000);
      const nextStop = targetEntry.stop
        ? new Date(new Date(targetEntry.stop).getTime() + minutesDelta * 60_000)
        : undefined;

      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: targetEntry.billable,
          description: targetEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(targetEntry),
          start: toTrackIso(nextStart),
          stop: nextStop ? toTrackIso(nextStop) : undefined,
          tagIds: targetEntry.tag_ids ?? [],
          taskId: targetEntry.task_id ?? targetEntry.tid ?? null,
        },
        timeEntryId: entryId,
        workspaceId: workspaceForEntry,
      });
    },
    [updateTimeEntryMutation, visibleEntries],
  );

  const handleCalendarEntryResize = useCallback(
    async (entryId: number, edge: "start" | "end", minutesDelta: number) => {
      if (minutesDelta === 0) {
        return;
      }

      const targetEntry = visibleEntries.find((entry) => entry.id === entryId);
      if (!targetEntry?.start || !targetEntry.stop) {
        return;
      }

      const workspaceForEntry = targetEntry.workspace_id ?? targetEntry.wid;
      if (typeof workspaceForEntry !== "number") {
        return;
      }

      const startMs = new Date(targetEntry.start).getTime();
      const stopMs = new Date(targetEntry.stop).getTime();
      const deltaMs = minutesDelta * 60_000;
      const nextStartMs = edge === "start" ? startMs + deltaMs : startMs;
      const nextStopMs = edge === "end" ? stopMs + deltaMs : stopMs;

      if (nextStartMs >= nextStopMs) {
        return;
      }

      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: targetEntry.billable,
          description: targetEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(targetEntry),
          start: toTrackIso(new Date(nextStartMs)),
          stop: toTrackIso(new Date(nextStopMs)),
          tagIds: targetEntry.tag_ids ?? [],
          taskId: targetEntry.task_id ?? targetEntry.tid ?? null,
        },
        timeEntryId: entryId,
        workspaceId: workspaceForEntry,
      });
    },
    [updateTimeEntryMutation, visibleEntries],
  );

  const handleTimesheetCellEdit = useCallback(
    async (projectLabel: string, dayIndex: number, durationSeconds: number) => {
      if (dayIndex < 0 || dayIndex >= weekDays.length) return;

      const dayKey = formatDateKey(weekDays[dayIndex], timezone);

      // Find entries matching this project label and day
      const matchingEntries = visibleEntries.filter((entry) => {
        const entryLabel = entry.project_name?.trim() || "(No project)";
        const entryDay = formatDateKey(new Date(entry.start ?? entry.at ?? Date.now()), timezone);
        return entryLabel === projectLabel && entryDay === dayKey;
      });

      if (matchingEntries.length === 0 && durationSeconds > 0) {
        // No entries exist for this cell. Create a new entry for that day.
        const dayDate = weekDays[dayIndex];
        const start = new Date(dayDate);
        start.setHours(9, 0, 0, 0);
        const stop = new Date(start.getTime() + durationSeconds * 1000);

        await createTimeEntryMutation.mutateAsync({
          billable: false,
          description: "",
          duration: durationSeconds,
          projectId: null,
          start: start.toISOString(),
          stop: stop.toISOString(),
          tagIds: [],
        });
        return;
      }

      if (matchingEntries.length === 1) {
        // Update the single entry's duration by adjusting its stop time
        const entry = matchingEntries[0];
        const entryWid = entry.workspace_id ?? entry.wid;
        if (typeof entry.id !== "number" || typeof entryWid !== "number" || !entry.start) return;

        if (durationSeconds === 0) {
          // Delete the entry when duration set to zero
          await deleteTimeEntryMutation.mutateAsync({
            timeEntryId: entry.id,
            workspaceId: entryWid,
          });
          return;
        }

        const startMs = new Date(entry.start).getTime();
        const nextStop = new Date(startMs + durationSeconds * 1000);

        await updateTimeEntryMutation.mutateAsync({
          request: {
            billable: entry.billable,
            description: entry.description ?? "",
            projectId: resolveTimeEntryProjectId(entry),
            start: entry.start,
            stop: toTrackIso(nextStop),
            tagIds: entry.tag_ids ?? [],
            taskId: entry.task_id ?? entry.tid ?? null,
          },
          timeEntryId: entry.id,
          workspaceId: entryWid,
        });
        return;
      }

      // Multiple entries: update the first entry to carry the new total, proportionally
      // For simplicity, adjust the first entry
      const currentTotal = matchingEntries.reduce(
        (sum, e) => sum + resolveEntryDurationSeconds(e),
        0,
      );
      if (currentTotal === 0) return;

      const firstEntry = matchingEntries[0];
      const firstWid = firstEntry.workspace_id ?? firstEntry.wid;
      if (typeof firstEntry.id !== "number" || typeof firstWid !== "number" || !firstEntry.start)
        return;

      const firstDuration = resolveEntryDurationSeconds(firstEntry);
      const diff = durationSeconds - currentTotal;
      const newFirstDuration = Math.max(0, firstDuration + diff);
      const startMs = new Date(firstEntry.start).getTime();
      const nextStop = new Date(startMs + newFirstDuration * 1000);

      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: firstEntry.billable,
          description: firstEntry.description ?? "",
          projectId: resolveTimeEntryProjectId(firstEntry),
          start: firstEntry.start,
          stop: toTrackIso(nextStop),
          tagIds: firstEntry.tag_ids ?? [],
          taskId: firstEntry.task_id ?? firstEntry.tid ?? null,
        },
        timeEntryId: firstEntry.id,
        workspaceId: firstWid,
      });
    },
    [
      createTimeEntryMutation,
      deleteTimeEntryMutation,
      timezone,
      updateTimeEntryMutation,
      visibleEntries,
      weekDays,
    ],
  );

  const handleCopyLastWeek = useCallback(async () => {
    const lastWeekDate = new Date(weekDays[0]);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekDays = getWeekDaysForDate(lastWeekDate, beginningOfWeek);
    const lastWeekStart = formatTrackQueryDate(lastWeekDays[0]);
    const lastWeekEnd = formatTrackQueryDate(lastWeekDays[6]);

    const lastWeekEntries = await unwrapWebApiResult(
      getTimeEntries({
        query: {
          end_date: lastWeekEnd,
          meta: true,
          start_date: lastWeekStart,
        },
      }),
    );

    const filtered = (lastWeekEntries ?? []).filter(
      (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
        const wid = entry.workspace_id ?? entry.wid;
        return wid === workspaceId && entry.start && entry.stop;
      },
    );

    for (const entry of filtered) {
      if (!entry.start || !entry.stop) continue;
      const startMs = new Date(entry.start).getTime();
      const stopMs = new Date(entry.stop).getTime();
      const shiftMs = 7 * 24 * 60 * 60 * 1000;
      const newStart = new Date(startMs + shiftMs);
      const newStop = new Date(stopMs + shiftMs);
      const durationSec = Math.round((stopMs - startMs) / 1000);

      await createTimeEntryMutation.mutateAsync({
        billable: entry.billable,
        description: (entry.description ?? "").trim(),
        duration: durationSec,
        projectId: resolveTimeEntryProjectId(entry),
        start: toTrackIso(newStart),
        stop: toTrackIso(newStop),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
    }
  }, [weekDays, beginningOfWeek, workspaceId, createTimeEntryMutation]);

  const handleEntryEdit = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => {
      // Anchor coordinates are page-relative (viewport coords + window.scrollY).
      // The editor uses absolute positioning inside a position:relative page
      // container, so it scrolls natively with window scroll — no JS compensation.
      const pageContainer = document.querySelector<HTMLElement>(
        '[data-testid="tracking-timer-page"]',
      );
      const pageRect = pageContainer?.getBoundingClientRect();
      const pageLeft = pageRect?.left ?? 0;
      const pageTop = (pageRect?.top ?? 0) + window.scrollY;
      const containerWidth = pageContainer?.clientWidth ?? window.innerWidth;
      const anchorLeft = anchorRect.left - pageLeft;
      const preferredPlacement = anchorLeft > containerWidth / 2 ? "left" : "right";
      setSelectedEntry(entry);
      setSelectedEntryAnchor({
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

  const [calendarDraftEntry, setCalendarDraftEntry] =
    useState<GithubComTogglTogglApiInternalModelsTimeEntry | null>(null);

  const handleCalendarSlotCreate = useCallback(
    (slot: { end: Date; start: Date }) => {
      // If editor is already open, just close it — don't create a new entry
      if (selectedEntry != null) {
        closeSelectedEntryEditor();
        setCalendarDraftEntry(null);
        return;
      }

      const startDate = slot.start;
      const endDate = slot.end;
      const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

      const draftEntry: GithubComTogglTogglApiInternalModelsTimeEntry = {
        billable: false,
        description: "",
        duration: durationSeconds > 0 ? durationSeconds : 1800,
        start: toTrackIso(startDate),
        stop: toTrackIso(endDate),
        workspace_id: workspaceId,
        tag_ids: [],
      };

      setIsNewEntry(true);
      // Set draft entry so CalendarView renders it; the CalendarEventCard
      // auto-open effect will call handleEntryEdit with the real DOM rect.
      setCalendarDraftEntry(draftEntry);
      setSelectedEntry(draftEntry);
    },
    [selectedEntry, closeSelectedEntryEditor, workspaceId],
  );

  const openComposerSuggestions = useCallback(() => {
    if (!timerDescriptionInputRef.current || runningEntry?.id != null) {
      return;
    }
    const anchorRect = timerDescriptionInputRef.current.getBoundingClientRect();
    setComposerSuggestionsAnchor({
      height: anchorRect.height,
      left: anchorRect.left,
      top: anchorRect.top,
      width: anchorRect.width,
    });
  }, [runningEntry]);

  const handleBulkEdit = useCallback(
    async (ids: number[], updates: BulkEditUpdates) => {
      const operations: { op: "add" | "remove" | "replace"; path: string; value: unknown }[] = [];

      if (updates.description != null) {
        operations.push({ op: "replace", path: "/description", value: updates.description });
      }
      if (updates.projectId !== undefined) {
        operations.push({
          op: "replace",
          path: "/project_id",
          value: updates.projectId ?? 0,
        });
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

      if (operations.length === 0) {
        return;
      }

      await bulkEditMutation.mutateAsync({ operations, timeEntryIds: ids });
    },
    [bulkEditMutation],
  );

  const handleBulkDelete = useCallback(
    async (ids: number[]) => {
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation],
  );

  const handleIdleDescriptionFocus = useCallback(() => {
    if (runningEntry?.id != null) {
      return;
    }
    if (draftProjectId != null || draftTagIds.length > 0) {
      return;
    }
    openComposerSuggestions();
  }, [runningEntry, draftProjectId, draftTagIds, openComposerSuggestions]);

  return {
    // View state
    view,
    setView,
    calendarSubview,
    setCalendarSubview,
    timerInputMode,
    setTimerInputMode,
    calendarZoom,
    setCalendarZoom,
    listDateRange,
    setListDateRange,

    // Time state
    beginningOfWeek,
    nowMs,
    selectedWeekDate,
    setSelectedWeekDate,
    weekDays,
    weekRange,

    // Running entry state
    runningEntry,
    runningDurationSeconds,
    runningDescription,
    setRunningDescription,

    // Draft state
    draftDescription,
    setDraftDescription,
    draftProjectId,
    setDraftProjectId,
    draftTagIds,
    setDraftTagIds,
    draftBillable,
    setDraftBillable,
    draftTags,

    // Display values
    displayProject,
    displayColor,
    timerDescriptionValue,

    // Selected entry state
    selectedEntry,
    setSelectedEntry,
    selectedEntryAnchor,
    setSelectedEntryAnchor,
    isNewEntry,
    calendarDraftEntry,

    // Composer suggestions
    composerSuggestionsAnchor,
    setComposerSuggestionsAnchor,

    // Refs
    timerDescriptionInputRef,
    scrollAreaRef,

    // Query data
    entries,
    visibleEntries,
    timeEntriesQuery,
    currentTimeEntryQuery,
    recentWorkspaceEntries,
    searchedTimeEntries,
    projectOptions,
    tagOptions,
    workspaceId,
    timezone,
    todayTotalSeconds,
    weekTotalSeconds,
    groupedEntries,
    trackStrip,
    calendarHours,
    timesheetRows,

    // Pagination
    hasMoreEntries,
    isLoadingMoreEntries,
    loadMoreEntries,

    // Mutation states
    timerMutationPending,
    timerErrorMessage,

    // Bulk action handlers
    handleBulkEdit,
    handleBulkDelete,

    // Handlers
    handleTimerAction,
    handleRunningDescriptionCommit,
    handleContinueEntry,
    handleStartFromUrl,
    handleCalendarSlotCreate,
    handleCalendarEntryMove,
    handleCalendarEntryResize,
    handleCopyLastWeek,
    handleTimesheetCellEdit,
    handleEntryEdit,
    handleIdleDescriptionFocus,
    closeSelectedEntryEditor,
    closeComposerSuggestions,
    switchWorkspace,

    // Query mutations
    createProjectMutation,
    createTagMutation,
    createWorkspaceFavoriteMutation,
    deleteTimeEntryMutation,
    createTimeEntryMutation,
    updateTimeEntryMutation,

    // Session
    session,
  };
}
