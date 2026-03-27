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
  usePreferencesQuery,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTagsQuery,
  useTimeEntriesQuery,
  useUpdateTimeEntryMutation,
  useUpdateWebSessionMutation,
} from "../../shared/query/web-shell.ts";
import type { BulkEditUpdates } from "../../features/tracking/BulkEditDialog.tsx";
import type { TimeEntryEditorAnchor } from "../../features/tracking/TimeEntryEditorDialog.tsx";
import type { TimerComposerSuggestionsAnchor } from "../../features/tracking/TimerComposerSuggestionsDialog.tsx";
import type {
  CalendarSubview,
  TimerInputMode,
  TimerViewMode,
} from "../../features/tracking/timer-view-mode.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "../../features/tracking/week-range.ts";
import { getTimeEntries } from "../../shared/api/public/track/index.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { useSession, useSessionActions } from "../../shared/session/session-context.tsx";

const TIMER_VIEW_STORAGE_KEY = "opentoggl:user-prefs:timer-view";

function loadPersistedTimerView(): TimerViewMode {
  try {
    const stored = localStorage.getItem(TIMER_VIEW_STORAGE_KEY);
    if (stored === "calendar" || stored === "list" || stored === "timesheet") {
      return stored;
    }
  } catch {
    // localStorage not available or parse error
  }
  return "calendar";
}

function persistTimerView(view: TimerViewMode): void {
  try {
    localStorage.setItem(TIMER_VIEW_STORAGE_KEY, view);
  } catch {
    // localStorage not available or write error
  }
}

const CALENDAR_SUBVIEW_STORAGE_KEY = "opentoggl:user-prefs:calendar-subview";

function loadPersistedCalendarSubview(): CalendarSubview {
  try {
    const stored = localStorage.getItem(CALENDAR_SUBVIEW_STORAGE_KEY);
    if (stored === "day" || stored === "five-day" || stored === "week") {
      return stored;
    }
  } catch {
    // localStorage not available or parse error
  }
  return "week";
}

function persistCalendarSubview(subview: CalendarSubview): void {
  try {
    localStorage.setItem(CALENDAR_SUBVIEW_STORAGE_KEY, subview);
  } catch {
    // localStorage not available or write error
  }
}

const TIMER_INPUT_MODE_STORAGE_KEY = "opentoggl:user-prefs:timer-input-mode";

function loadPersistedTimerInputMode(): TimerInputMode {
  try {
    const stored = localStorage.getItem(TIMER_INPUT_MODE_STORAGE_KEY);
    if (stored === "automatic" || stored === "manual") {
      return stored;
    }
  } catch {
    // localStorage not available or parse error
  }
  return "automatic";
}

function persistTimerInputMode(mode: TimerInputMode): void {
  try {
    localStorage.setItem(TIMER_INPUT_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage not available or write error
  }
}

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return entry.stop == null || (entry.duration ?? 0) < 0;
}

function areNumberListsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

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
  listAllDates: boolean;
  setListAllDates: (allDates: boolean) => void;

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
  selectedEntryWorkspaceId: number;
  selectedDescription: string;
  setSelectedDescription: (desc: string) => void;
  selectedEntryError: string | null;
  setSelectedEntryError: (error: string | null) => void;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  selectedTagIds: number[];
  setSelectedTagIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  selectedEntryDirty: boolean;
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

  // Mutation states
  timerMutationPending: boolean;
  timerErrorMessage: string;

  // Bulk action handlers
  handleBulkEdit: (ids: number[], updates: BulkEditUpdates) => Promise<void>;
  handleBulkDelete: (ids: number[]) => Promise<void>;

  // Handlers
  handleTimerAction: () => Promise<void>;
  handleRunningDescriptionCommit: () => Promise<void>;
  handleSelectedEntrySave: () => Promise<void>;
  handleSelectedEntryPrimaryAction: () => Promise<void>;
  handleSelectedEntryBillableToggle: () => void;
  handleSelectedEntryDelete: () => Promise<void>;
  handleSelectedEntryFavorite: () => Promise<void>;
  handleSelectedEntryDuplicate: () => Promise<void>;
  handleSelectedEntryProjectCreate: (name: string, color?: string) => Promise<void>;
  handleSelectedEntrySuggestionSelect: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
  ) => void;
  handleSelectedEntrySplit: () => Promise<void>;
  handleSelectedEntryTagCreate: (name: string) => Promise<void>;
  handleSelectedEntryStartTimeChange: (time: Date) => void;
  handleSelectedEntryStopTimeChange: (time: Date) => void;
  handleContinueEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => Promise<void>;
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
  const initialDate = options?.initialDate;
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const updateWebSessionMutation = useUpdateWebSessionMutation();
  const workspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";

  // View state with persistence
  const [view, setViewState] = useState<TimerViewMode>(loadPersistedTimerView);

  const setView = useCallback((next: TimerViewMode) => {
    persistTimerView(next);
    setViewState(next);
    if (next === "list") {
      setListAllDates(true);
    }
  }, []);

  // Calendar subview state with persistence
  const [calendarSubview, setCalendarSubviewState] = useState<CalendarSubview>(
    loadPersistedCalendarSubview,
  );

  const setCalendarSubview = useCallback((next: CalendarSubview) => {
    persistCalendarSubview(next);
    setCalendarSubviewState(next);
  }, []);

  // Timer input mode state with persistence
  const [timerInputMode, setTimerInputModeState] = useState<TimerInputMode>(
    loadPersistedTimerInputMode,
  );

  const setTimerInputMode = useCallback((next: TimerInputMode) => {
    persistTimerInputMode(next);
    setTimerInputModeState(next);
  }, []);

  // Calendar zoom level: -1 = zoomed out (fewer hours), 0 = default, +1 = zoomed in (more hours)
  const [calendarZoom, setCalendarZoomState] = useState(0);

  const setCalendarZoom = useCallback((zoom: number) => {
    setCalendarZoomState(Math.max(-1, Math.min(1, zoom)));
  }, []);

  // Whether list view shows all entries or a filtered date range
  const [listAllDates, setListAllDates] = useState(true);

  // Time state
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => initialDate ?? new Date());

  const beginningOfWeek = session.user.beginningOfWeek ?? 1;
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

  // Preferences
  const preferencesQuery = usePreferencesQuery();
  const collapseTimeEntries = preferencesQuery.data?.collapseTimeEntries ?? true;

  // Queries — list view in "all dates" mode fetches without date range;
  // otherwise all views (including list) use the selected week range.
  const timeEntriesQuery = useTimeEntriesQuery(
    view === "list" && listAllDates ? {} : { ...weekRange },
  );
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
  const [selectedDescription, setSelectedDescription] = useState("");
  const [selectedEntryError, setSelectedEntryError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedStartIso, setSelectedStartIso] = useState<string | null>(null);
  const [selectedStopIso, setSelectedStopIso] = useState<string | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);

  // Track which entry ID is currently open so the initialization effect only
  // fires when a genuinely different entry is selected, not when the entry
  // object is updated in-place (e.g. via time edits).
  const selectedEntryIdRef = useRef<number | null>(null);

  // Composer suggestions
  const [composerSuggestionsAnchor, setComposerSuggestionsAnchor] =
    useState<TimerComposerSuggestionsAnchor | null>(null);

  // Refs
  const timerDescriptionInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Derived state for selected entry workspace
  const selectedEntryWorkspaceId = useMemo(() => {
    const entryWorkspaceId = selectedEntry?.workspace_id ?? selectedEntry?.wid;
    return typeof entryWorkspaceId === "number" ? entryWorkspaceId : workspaceId;
  }, [selectedEntry, workspaceId]);

  const selectedEntryDirty = useMemo(() => {
    if (!selectedEntry) {
      return false;
    }

    const originalProjectId = selectedEntry.project_id ?? selectedEntry.pid ?? null;
    const originalTagIds = selectedEntry.tag_ids ?? [];

    return (
      selectedDescription !== (selectedEntry.description ?? "") ||
      selectedProjectId !== originalProjectId ||
      !areNumberListsEqual(selectedTagIds, originalTagIds) ||
      selectedStartIso !== (selectedEntry.start ?? null) ||
      selectedStopIso !== (selectedEntry.stop ?? null)
    );
  }, [
    selectedDescription,
    selectedEntry,
    selectedProjectId,
    selectedStartIso,
    selectedStopIso,
    selectedTagIds,
  ]);

  // Workspace-scoped queries
  const projectsQuery = useProjectsQuery(selectedEntryWorkspaceId, "all");
  const tagsQuery = useTagsQuery(selectedEntryWorkspaceId);
  const recentTimeEntriesQuery = useTimeEntriesQuery({});

  // Mutations
  const createProjectMutation = useCreateProjectMutation(selectedEntryWorkspaceId);
  const createTimeEntryMutation = useCreateTimeEntryMutation(selectedEntryWorkspaceId);
  const createWorkspaceFavoriteMutation =
    useCreateWorkspaceFavoriteMutation(selectedEntryWorkspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const createTagMutation = useCreateTagMutation(selectedEntryWorkspaceId);
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
    if (!runningEntry) {
      return;
    }
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningEntry]);

  useEffect(() => {
    setRunningDescription(runningEntry?.description ?? "");
  }, [runningEntry]);

  // Update document.title to show elapsed time when timer is running
  useEffect(() => {
    if (!runningEntry) {
      document.title = "OpenToggl";
      return;
    }
    const hours = Math.floor(runningDurationSeconds / 3600);
    const minutes = String(Math.floor((runningDurationSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(runningDurationSeconds % 60).padStart(2, "0");
    document.title = `${hours}:${minutes}:${seconds} \u00B7 OpenToggl`;
  }, [runningEntry, runningDurationSeconds]);

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

  useEffect(() => {
    const entryId = selectedEntry?.id ?? null;
    if (entryId != null && entryId === selectedEntryIdRef.current) {
      // Same entry — do not reinitialize editable fields. This avoids
      // resetting description/project/tags when start or stop time is
      // edited in-place (which updates the entry object).
      return;
    }
    selectedEntryIdRef.current = entryId;
    setSelectedDescription(selectedEntry?.description ?? "");
    setSelectedProjectId(selectedEntry?.project_id ?? selectedEntry?.pid ?? null);
    setSelectedTagIds(selectedEntry?.tag_ids ?? []);
    setSelectedStartIso(selectedEntry?.start ?? null);
    setSelectedStopIso(selectedEntry?.stop ?? null);
    setSelectedEntryError(null);
  }, [selectedEntry]);

  // Handlers
  const closeSelectedEntryEditor = useCallback(() => {
    selectedEntryIdRef.current = null;
    setSelectedEntry(null);
    setSelectedEntryAnchor(null);
    setSelectedEntryError(null);
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
        projectId: entry.project_id ?? entry.pid ?? null,
        start: new Date().toISOString(),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
      setRunningDescription(continuedDescription);
    },
    [startTimeEntryMutation],
  );

  const handleSelectedEntrySave = useCallback(async () => {
    if (!selectedEntry) {
      return;
    }

    // New entry: create via API, then close
    if (isNewEntry) {
      try {
        const durationSeconds = selectedEntry.duration ?? 1800;
        await createTimeEntryMutation.mutateAsync({
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          duration: durationSeconds > 0 ? durationSeconds : 1800,
          projectId: selectedProjectId,
          start: selectedEntry.start ?? toTrackIso(new Date()),
          stop: selectedEntry.stop ?? toTrackIso(new Date()),
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
        });
        setSelectedEntryError(null);
        closeSelectedEntryEditor();
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
      }
      return;
    }

    // Existing entry: update via API
    if (!selectedEntry.id) {
      return;
    }
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace and cannot be updated.");
      return;
    }
    try {
      const updatedEntry = await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          projectId: selectedProjectId,
          start: selectedEntry.start,
          stop: selectedEntry.stop,
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid,
        },
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      });
      if (selectedEntry.id === runningEntry?.id) {
        setSelectedEntry(updatedEntry);
      }
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    runningEntry,
    isNewEntry,
    createTimeEntryMutation,
    updateTimeEntryMutation,
    closeSelectedEntryEditor,
  ]);

  const handleSelectedEntryPrimaryAction = useCallback(async () => {
    if (!selectedEntry?.id) {
      return;
    }
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    try {
      if (isRunningTimeEntry(selectedEntry)) {
        await stopTimeEntryMutation.mutateAsync({
          timeEntryId: selectedEntry.id,
          workspaceId: selectedWorkspaceId,
        });
        setSelectedEntryError(null);
        closeSelectedEntryEditor();
        return;
      }
      if (selectedWorkspaceId !== workspaceId) {
        switchWorkspace(selectedWorkspaceId);
        closeSelectedEntryEditor();
        return;
      }
      await startTimeEntryMutation.mutateAsync({
        billable: selectedEntry.billable,
        description: selectedDescription.trim() || (selectedEntry.description ?? ""),
        projectId: selectedProjectId,
        start: new Date().toISOString(),
        tagIds: selectedTagIds,
        taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
      });
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    workspaceId,
    switchWorkspace,
    startTimeEntryMutation,
    stopTimeEntryMutation,
    closeSelectedEntryEditor,
  ]);

  const handleSelectedEntryDelete = useCallback(async () => {
    if (!selectedEntry?.id) {
      return;
    }
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    try {
      await deleteTimeEntryMutation.mutateAsync({
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      });
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
      throw error;
    }
  }, [selectedEntry, deleteTimeEntryMutation, closeSelectedEntryEditor]);

  const handleSelectedEntryDuplicate = useCallback(async () => {
    if (!selectedEntry?.id) {
      return;
    }
    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }
    if (isRunningTimeEntry(selectedEntry) || !selectedEntry.start || !selectedEntry.stop) {
      setSelectedEntryError("Only stopped time entries can be duplicated.");
      return;
    }
    try {
      await createTimeEntryMutation.mutateAsync({
        billable: selectedEntry.billable,
        description: selectedDescription.trim(),
        duration: resolveEntryDurationSeconds(selectedEntry),
        projectId: selectedProjectId,
        start: selectedEntry.start,
        stop: selectedEntry.stop,
        tagIds: selectedTagIds,
        taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
      });
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    selectedEntry,
    selectedDescription,
    selectedProjectId,
    selectedTagIds,
    createTimeEntryMutation,
    closeSelectedEntryEditor,
  ]);

  const handleSelectedEntryProjectCreate = useCallback(
    async (name: string, color?: string) => {
      try {
        const project = await createProjectMutation.mutateAsync({ color, name });
        setSelectedProjectId(project.id ?? null);
        setSelectedEntryError(null);
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
        throw error;
      }
    },
    [createProjectMutation],
  );

  const handleSelectedEntryTagCreate = useCallback(
    async (name: string) => {
      try {
        await createTagMutation.mutateAsync(name);
        setSelectedEntryError(null);
      } catch (error) {
        setSelectedEntryError(resolveSingleTimerErrorMessage(error));
        throw error;
      }
    },
    [createTagMutation],
  );

  const handleSelectedEntrySuggestionSelect = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => {
      setSelectedDescription(entry.description ?? "");
      setSelectedProjectId(entry.project_id ?? entry.pid ?? null);
      setSelectedTagIds(entry.tag_ids ?? []);
    },
    [],
  );

  const handleSelectedEntryBillableToggle = useCallback(() => {
    setSelectedEntry((current) => {
      if (!current) {
        return current;
      }

      return { ...current, billable: current.billable !== true };
    });
  }, []);

  const handleSelectedEntrySplit = useCallback(async () => {
    if (!selectedEntry?.id || !selectedEntry.start || !selectedEntry.stop) {
      setSelectedEntryError("Only stopped time entries can be split.");
      return;
    }

    const selectedWorkspaceId = selectedEntry.workspace_id ?? selectedEntry.wid;
    if (typeof selectedWorkspaceId !== "number") {
      setSelectedEntryError("This time entry is missing a workspace.");
      return;
    }

    const startMs = new Date(selectedEntry.start).getTime();
    const stopMs = new Date(selectedEntry.stop).getTime();
    const midpointMs = startMs + Math.floor((stopMs - startMs) / 2);
    if (!Number.isFinite(midpointMs) || midpointMs <= startMs || midpointMs >= stopMs) {
      setSelectedEntryError("This time entry is too short to split.");
      return;
    }

    try {
      await updateTimeEntryMutation.mutateAsync({
        request: {
          billable: selectedEntry.billable,
          description: selectedDescription.trim(),
          projectId: selectedProjectId,
          start: selectedEntry.start,
          stop: new Date(midpointMs).toISOString(),
          tagIds: selectedTagIds,
          taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
        },
        timeEntryId: selectedEntry.id,
        workspaceId: selectedWorkspaceId,
      });
      await createTimeEntryMutation.mutateAsync({
        billable: selectedEntry.billable,
        description: selectedDescription.trim(),
        duration: Math.round((stopMs - midpointMs) / 1000),
        projectId: selectedProjectId,
        start: new Date(midpointMs).toISOString(),
        stop: selectedEntry.stop,
        tagIds: selectedTagIds,
        taskId: selectedEntry.task_id ?? selectedEntry.tid ?? null,
      });
      setSelectedEntryError(null);
      closeSelectedEntryEditor();
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    closeSelectedEntryEditor,
    createTimeEntryMutation,
    selectedDescription,
    selectedEntry,
    selectedProjectId,
    selectedTagIds,
    updateTimeEntryMutation,
  ]);

  const handleSelectedEntryFavorite = useCallback(async () => {
    try {
      await createWorkspaceFavoriteMutation.mutateAsync({
        billable: selectedEntry?.billable,
        description: selectedDescription.trim(),
        projectId: selectedProjectId,
        tagIds: selectedTagIds,
        taskId: selectedEntry?.task_id ?? selectedEntry?.tid ?? null,
      });
      setSelectedEntryError(null);
    } catch (error) {
      setSelectedEntryError(resolveSingleTimerErrorMessage(error));
    }
  }, [
    createWorkspaceFavoriteMutation,
    selectedDescription,
    selectedEntry,
    selectedProjectId,
    selectedTagIds,
  ]);

  const handleSelectedEntryStartTimeChange = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setSelectedStartIso(nextIso);
    setSelectedEntry((current) => {
      if (!current) return current;
      return { ...current, start: nextIso };
    });
  }, []);

  const handleSelectedEntryStopTimeChange = useCallback((time: Date) => {
    const nextIso = time.toISOString();
    setSelectedStopIso(nextIso);
    setSelectedEntry((current) => {
      if (!current) return current;
      return { ...current, stop: nextIso };
    });
  }, []);

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
          projectId: targetEntry.project_id ?? targetEntry.pid ?? null,
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
          projectId: targetEntry.project_id ?? targetEntry.pid ?? null,
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
            projectId: entry.project_id ?? entry.pid ?? null,
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
          projectId: firstEntry.project_id ?? firstEntry.pid ?? null,
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
        projectId: entry.project_id ?? entry.pid ?? null,
        start: toTrackIso(newStart),
        stop: toTrackIso(newStop),
        tagIds: entry.tag_ids ?? [],
        taskId: entry.task_id ?? entry.tid ?? null,
      });
    }
  }, [weekDays, beginningOfWeek, workspaceId, createTimeEntryMutation]);

  const handleEntryEdit = useCallback(
    (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => {
      const scrollAreaRect = scrollAreaRef.current?.getBoundingClientRect();
      const scrollLeft = scrollAreaRef.current?.scrollLeft ?? 0;
      const scrollTop = scrollAreaRef.current?.scrollTop ?? 0;
      const containerWidth = scrollAreaRef.current?.clientWidth;
      const anchorLeft = scrollAreaRect
        ? anchorRect.left - scrollAreaRect.left + scrollLeft
        : anchorRect.left;
      const preferredPlacement =
        containerWidth != null && anchorLeft > containerWidth / 2 ? "left" : "right";
      setSelectedEntry(entry);
      setSelectedEntryAnchor({
        containerHeight: scrollAreaRef.current?.scrollHeight,
        containerWidth,
        height: anchorRect.height,
        left: anchorLeft,
        preferredPlacement,
        top: scrollAreaRect ? anchorRect.top - scrollAreaRect.top + scrollTop : anchorRect.top,
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
    listAllDates,
    setListAllDates,

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
    selectedEntryWorkspaceId,
    selectedDescription,
    setSelectedDescription,
    selectedEntryError,
    setSelectedEntryError,
    selectedProjectId,
    setSelectedProjectId,
    selectedTagIds,
    setSelectedTagIds,
    selectedEntryDirty,
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

    // Mutation states
    timerMutationPending,
    timerErrorMessage,

    // Bulk action handlers
    handleBulkEdit,
    handleBulkDelete,

    // Handlers
    handleTimerAction,
    handleRunningDescriptionCommit,
    handleSelectedEntrySave,
    handleSelectedEntryPrimaryAction,
    handleSelectedEntryBillableToggle,
    handleSelectedEntryDelete,
    handleSelectedEntryFavorite,
    handleSelectedEntryDuplicate,
    handleSelectedEntryProjectCreate,
    handleSelectedEntryTagCreate,
    handleSelectedEntrySuggestionSelect,
    handleSelectedEntrySplit,
    handleSelectedEntryStartTimeChange,
    handleSelectedEntryStopTimeChange,
    handleContinueEntry,
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
    deleteTimeEntryMutation,
    createTimeEntryMutation,
    updateTimeEntryMutation,

    // Session
    session,
  };
}
