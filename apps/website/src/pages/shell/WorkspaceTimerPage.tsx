import { type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import {
  CalendarSubviewSelect,
  ChromeIconButton,
  ViewTab,
  ViewTabGroup,
} from "../../features/tracking/overview-views.tsx";
import {
  type DisplaySettings,
  DisplaySettingsPopover,
  readDisplaySettings,
} from "../../features/tracking/DisplaySettingsPopover.tsx";
import { GoalsFavoritesSidebar } from "../../features/tracking/GoalsFavoritesSidebar.tsx";
import { KeyboardShortcutsDialog } from "../../features/tracking/KeyboardShortcutsDialog.tsx";
import { SelfContainedTimeEntryEditor } from "../../features/tracking/SelfContainedTimeEntryEditor.tsx";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import { createPreferencesFormValues } from "../../shared/forms/profile-form.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import { useRangePickerClose, WeekRangePicker } from "../../features/tracking/WeekRangePicker.tsx";
import {
  formatDayLabel,
  formatTrackQueryDate,
  formatWeekRangeLabel,
  getWeekDaysForDate,
  CALENDAR_SHORTCUTS,
  shiftDay,
  shiftWeek,
  type WeekShortcut,
  WEEK_SHORTCUTS,
} from "../../features/tracking/week-range.ts";
import { PanelRightIcon, SettingsIcon } from "../../shared/ui/icons.tsx";
import {
  useCreateTimeEntryMutation,
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useGoalsQuery,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useTagsQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { useTimerViewStore } from "../../features/tracking/store/timer-view-store.ts";
import { useWeekNavigation } from "../../features/tracking/useWeekNavigation.ts";
import { normalizeProjects, normalizeTags } from "../../features/tracking/useWorkspaceData.ts";
import { TimerComposerBar } from "../../features/tracking/TimerComposerBar.tsx";
import { TimerHeaderStats, ProjectFilterStrip } from "../../features/tracking/TimerHeaderStats.tsx";
import { ConnectedListView } from "../../features/tracking/ConnectedListView.tsx";
import { ConnectedCalendarView } from "../../features/tracking/ConnectedCalendarView.tsx";
import { ConnectedTimesheetView } from "../../features/tracking/ConnectedTimesheetView.tsx";

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

type StartParams = {
  description?: string;
  projectId?: number;
  tagIds?: number[];
  billable?: boolean;
};

type WorkspaceTimerPageProps = {
  initialDate?: Date;
  startParams?: StartParams;
};

export function WorkspaceTimerPage({
  initialDate,
  startParams,
}: WorkspaceTimerPageProps): ReactElement {
  const { t } = useTranslation("tracking");

  // Local UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [hideSecondaryHeaderLabels, setHideSecondaryHeaderLabels] = useState(false);
  const [deleteToast, setDeleteToast] = useState<DeletedEntrySnapshot | null>(null);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerControlsRef = useRef<HTMLDivElement | null>(null);

  // View state from Zustand — the only data subscriptions in WTP
  const view = useTimerViewStore((s) => s.view);
  const setView = useTimerViewStore((s) => s.setView);
  const calendarSubview = useTimerViewStore((s) => s.calendarSubview);
  const setCalendarSubview = useTimerViewStore((s) => s.setCalendarSubview);
  const listDateRange = useTimerViewStore((s) => s.listDateRange);
  const setListDateRange = useTimerViewStore((s) => s.setListDateRange);

  // Week navigation — only used by the toolbar range picker
  const { selectedWeekDate, setSelectedWeekDate, beginningOfWeek } = useWeekNavigation();

  // Session context — no React Query subscriptions, just context
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;

  // Delete toast handlers
  const showDeleteToast = (snapshot: DeletedEntrySnapshot) => {
    if (deleteToastTimerRef.current) {
      clearTimeout(deleteToastTimerRef.current);
    }
    setDeleteToast(snapshot);
    deleteToastTimerRef.current = setTimeout(() => {
      setDeleteToast(null);
      deleteToastTimerRef.current = null;
    }, 5000);
  };

  const createTimeEntryMutation = useCreateTimeEntryMutation(workspaceId);
  const handleUndoDelete = () => {
    if (!deleteToast) return;
    if (deleteToastTimerRef.current) {
      clearTimeout(deleteToastTimerRef.current);
      deleteToastTimerRef.current = null;
    }
    void createTimeEntryMutation.mutateAsync({
      billable: deleteToast.billable,
      description: deleteToast.description,
      duration: deleteToast.duration,
      projectId: deleteToast.projectId,
      start: deleteToast.start,
      stop: deleteToast.stop,
      tagIds: deleteToast.tagIds,
      taskId: deleteToast.taskId,
    });
    setDeleteToast(null);
  };

  useEffect(() => {
    return () => {
      if (deleteToastTimerRef.current) {
        clearTimeout(deleteToastTimerRef.current);
      }
    };
  }, []);

  // Header density observer
  useEffect(() => {
    const node = headerControlsRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frameId = 0;
    const syncHeaderDensity = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const shouldHideLabels = node.scrollWidth > node.clientWidth;
        setHideSecondaryHeaderLabels((current) =>
          current === shouldHideLabels ? current : shouldHideLabels,
        );
      });
    };

    syncHeaderDensity();
    const observer = new ResizeObserver(syncHeaderDensity);
    observer.observe(node);
    window.addEventListener("resize", syncHeaderDensity);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderDensity);
    };
  }, [view, calendarSubview]);

  const onShortcutsToggle = () => {
    setShortcutsOpen((prev) => !prev);
  };

  return (
    <div
      className="relative min-h-screen bg-[var(--track-surface)] text-white"
      data-testid="tracking-timer-page"
    >
      <header
        className="sticky top-0 z-20 border-b border-[var(--track-border)] bg-[var(--track-surface)]"
        ref={(el) => {
          if (el) {
            const height = el.offsetHeight;
            el.style.setProperty("--timer-header-height", `${height}px`);
            document.documentElement.style.setProperty("--timer-header-height", `${height}px`);
          }
        }}
      >
        <TimerComposerBar
          initialDate={initialDate}
          onShortcutsToggle={onShortcutsToggle}
          startParams={startParams}
        />

        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-4" ref={headerControlsRef}>
            <TimerRangePicker
              beginningOfWeek={beginningOfWeek}
              calendarSubview={calendarSubview}
              listDateRange={listDateRange}
              selectedWeekDate={selectedWeekDate}
              setCalendarSubview={setCalendarSubview}
              setListDateRange={setListDateRange}
              setSelectedWeekDate={setSelectedWeekDate}
              setView={setView}
              view={view}
            />
            <TimerHeaderStats hideLabel={hideSecondaryHeaderLabels} />
            <div className="ml-auto flex items-center gap-3">
              {view === "calendar" ? (
                <CalendarSubviewSelect
                  onChange={(next) => {
                    setCalendarSubview(next);
                    if (next === "day" && calendarSubview !== "day") {
                      setSelectedWeekDate(new Date());
                    }
                  }}
                  value={calendarSubview}
                />
              ) : null}
              <ViewTabGroup
                aria-label={t("timerView")}
                label={t("timerView")}
                onSelect={setView}
                options={["calendar", "list", "timesheet"]}
                value={view}
              >
                <ViewTab currentView={view} onSelect={setView} targetView="calendar" />
                <ViewTab currentView={view} onSelect={setView} targetView="list" />
                <ViewTab currentView={view} onSelect={setView} targetView="timesheet" />
              </ViewTabGroup>
              <div className="relative">
                <ChromeIconButton
                  active={settingsOpen}
                  aria-label={t("displaySettings")}
                  icon={<SettingsIcon className="size-4" />}
                  onClick={() => setSettingsOpen((prev) => !prev)}
                />
                {settingsOpen ? (
                  <DisplaySettingsPopover
                    onClose={() => setSettingsOpen(false)}
                    onDisplaySettingsChange={setDisplaySettings}
                    onToggleShowAllEntries={() => setShowAllEntries((prev) => !prev)}
                    showAllEntries={showAllEntries}
                  />
                ) : null}
              </div>
              <ChromeIconButton
                active={sidebarOpen}
                aria-label={t("toggleGoalsAndFavorites")}
                icon={<PanelRightIcon className="size-4" />}
                onClick={() => setSidebarOpen((prev) => !prev)}
              />
            </div>
          </div>
          <ProjectFilterStrip />
        </div>
      </header>
      <div className="flex min-h-0">
        <div className="min-w-0 flex-1">
          {view === "list" ? (
            <ConnectedListView showAllEntries={showAllEntries} onDeleteWithUndo={showDeleteToast} />
          ) : null}
          {view === "calendar" ? (
            <ConnectedCalendarView
              calendarHours={displaySettings.calendarHours}
              showAllEntries={showAllEntries}
              onDeleteWithUndo={showDeleteToast}
            />
          ) : null}
          {view === "timesheet" ? <ConnectedTimesheetView showAllEntries={showAllEntries} /> : null}
          <EditorPortal onDeleteWithUndo={showDeleteToast} />
        </div>
        {sidebarOpen ? <ConnectedSidebar workspaceId={workspaceId} /> : null}
      </div>
      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
      {deleteToast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-3 shadow-[0_10px_30px_var(--track-shadow-banner)]">
          <span className="text-[14px] text-white">{t("timeEntryDeleted")}</span>
          <button
            className="text-[14px] font-semibold text-[var(--track-accent)] transition hover:text-[var(--track-accent-text)]"
            onClick={handleUndoDelete}
            type="button"
          >
            {t("undo")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Reads editor state from the store — isolated from WorkspaceTimerPage
 * so that opening/closing the editor does not re-render the entry lists.
 * Self-subscribes to favorites and session data.
 */
function EditorPortal({
  onDeleteWithUndo,
}: {
  onDeleteWithUndo: (snapshot: DeletedEntrySnapshot) => void;
}): ReactElement | null {
  const queryClient = useQueryClient();
  const selectedEntry = useTimerViewStore((s) => s.selectedEntry);
  const selectedEntryAnchor = useTimerViewStore((s) => s.selectedEntryAnchor);
  const isNewEntry = useTimerViewStore((s) => s.isNewEntry);
  const closeEditor = useTimerViewStore((s) => s.closeEditor);

  // Self-subscribe — only renders when editor is open
  const editorSession = useSession();
  const editorWorkspaceId = editorSession.currentWorkspace.id;
  const editorFavoritesQuery = useFavoritesQuery(editorWorkspaceId);
  const editorFavorites = Array.isArray(editorFavoritesQuery.data) ? editorFavoritesQuery.data : [];
  const editorPreferences = createPreferencesFormValues(
    (queryClient.getQueryData(["web-preferences"]) as Parameters<
      typeof createPreferencesFormValues
    >[0]) ?? {},
  );
  const projectsQuery = useProjectsQuery(editorWorkspaceId, "all");
  const editorProjects = normalizeProjects(projectsQuery.data)
    .filter((project) => project.id != null && project.active !== false)
    .map((project) => ({
      clientName: project.client_name ?? undefined,
      color: resolveProjectColorValue(project),
      id: project.id as number,
      name: project.name ?? "Untitled project",
      pinned: project.pinned === true,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const tagsQuery = useTagsQuery(editorWorkspaceId);
  const editorTags = normalizeTags(tagsQuery.data);
  const editorRecentEntries = queryClient.getQueryData(["time-entries", null, null, false]);

  if (!selectedEntry || !selectedEntryAnchor) return null;

  return (
    <SelfContainedTimeEntryEditor
      anchor={selectedEntryAnchor}
      currentWorkspaceId={editorWorkspaceId}
      durationFormat={editorPreferences.durationFormat}
      entry={selectedEntry}
      favorites={editorFavorites}
      isNewEntry={isNewEntry}
      onClose={closeEditor}
      onDeleteWithUndo={onDeleteWithUndo}
      projects={editorProjects}
      recentEntries={Array.isArray(editorRecentEntries) ? editorRecentEntries : []}
      tags={editorTags}
      timeofdayFormat={editorPreferences.timeofdayFormat}
      timezone={editorSession.user.timezone || "UTC"}
      workspaces={editorSession.availableWorkspaces.map((workspace) => ({
        id: workspace.id,
        isCurrent: workspace.isCurrent,
        name: workspace.name,
      }))}
    />
  );
}

function TimerRangePicker({
  beginningOfWeek,
  calendarSubview,
  listDateRange,
  selectedWeekDate,
  setCalendarSubview,
  setListDateRange,
  setSelectedWeekDate,
  setView,
  view,
}: {
  beginningOfWeek: number;
  calendarSubview: string;
  listDateRange: { startDate: string; endDate: string } | null;
  selectedWeekDate: Date;
  setCalendarSubview: (next: "day" | "five-day" | "week") => void;
  setListDateRange: (range: { startDate: string; endDate: string } | null) => void;
  setSelectedWeekDate: (date: Date) => void;
  setView: (next: "calendar" | "list" | "timesheet") => void;
  view: string;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const isAllDates = view === "list" && listDateRange == null;
  const isDayMode = !isAllDates && view !== "list" && calendarSubview === "day";
  const mode = isDayMode ? "day" : "week";
  const [activeShortcut, setActiveShortcut] = useState<string | null>("this-week");

  const label = isAllDates
    ? t("allDates")
    : activeShortcut === "last-30-days"
      ? t("last30Days")
      : isDayMode
        ? formatDayLabel(selectedWeekDate)
        : formatWeekRangeLabel(selectedWeekDate, beginningOfWeek);

  const handleSelectDate = (date: Date) => {
    if (view === "list") {
      const days = getWeekDaysForDate(date, beginningOfWeek);
      setListDateRange({
        startDate: formatTrackQueryDate(days[0]),
        endDate: formatTrackQueryDate(days[6]),
      });
    }
    setSelectedWeekDate(date);
    setActiveShortcut(null);
  };

  const handlePrev = () => {
    handleSelectDate(isDayMode ? shiftDay(selectedWeekDate, -1) : shiftWeek(selectedWeekDate, -1));
  };

  const handleNext = () => {
    handleSelectDate(isDayMode ? shiftDay(selectedWeekDate, 1) : shiftWeek(selectedWeekDate, 1));
  };

  const handleShortcut = (shortcutId: string, date: Date) => {
    setActiveShortcut(shortcutId);
    if (shortcutId === "all-dates") {
      setListDateRange(null);
      if (view !== "list") setView("list");
    } else if (shortcutId === "last-30-days") {
      if (view === "list") {
        setListDateRange({
          startDate: formatTrackQueryDate(date),
          endDate: formatTrackQueryDate(new Date()),
        });
      } else {
        setCalendarSubview("week");
      }
      setSelectedWeekDate(date);
    } else if (shortcutId === "today" || shortcutId === "yesterday") {
      if (view === "list") {
        const dayStr = formatTrackQueryDate(date);
        setListDateRange({ startDate: dayStr, endDate: dayStr });
      } else {
        setCalendarSubview("day");
      }
      setSelectedWeekDate(date);
    } else {
      if (view === "list") {
        const days = getWeekDaysForDate(date, beginningOfWeek);
        setListDateRange({
          startDate: formatTrackQueryDate(days[0]),
          endDate: formatTrackQueryDate(days[6]),
        });
      } else {
        setCalendarSubview("week");
      }
      setSelectedWeekDate(date);
    }
  };

  return (
    <WeekRangePicker
      disabled={isAllDates}
      label={label}
      mode={mode}
      onNext={handleNext}
      onPrev={handlePrev}
      onSelectDate={handleSelectDate}
      selectedDate={selectedWeekDate}
      sidebar={
        <TimerDateShortcuts
          activeShortcut={activeShortcut}
          onShortcut={handleShortcut}
          shortcuts={view === "list" ? WEEK_SHORTCUTS : CALENDAR_SHORTCUTS}
        />
      }
      weekStartsOn={beginningOfWeek}
    />
  );
}

function TimerDateShortcuts({
  activeShortcut,
  onShortcut,
  shortcuts,
}: {
  activeShortcut: string | null;
  onShortcut: (id: string, date: Date) => void;
  shortcuts: WeekShortcut[];
}): ReactElement {
  const { t } = useTranslation("tracking");
  const close = useRangePickerClose();

  return (
    <>
      {shortcuts.map((shortcut) => {
        const shortcutDate = shortcut.resolveDate(new Date());
        const isActive = activeShortcut === shortcut.id;

        return (
          <button
            aria-pressed={isActive}
            className={`w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition ${
              isActive
                ? "bg-[var(--track-accent-strong)] text-white"
                : "text-[var(--track-overlay-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
            }`}
            key={shortcut.id}
            onClick={() => {
              onShortcut(shortcut.id, shortcutDate);
              close();
            }}
            type="button"
          >
            {t(shortcut.label)}
          </button>
        );
      })}
    </>
  );
}

/**
 * Self-contained sidebar — subscribes to favorites/goals queries internally.
 * Only mounts when the sidebar is open, so queries don't run when closed.
 */
function ConnectedSidebar({ workspaceId }: { workspaceId: number }): ReactElement {
  const { isGoalsViewShown } = useUserPreferences();
  const favoritesQuery = useFavoritesQuery(workspaceId);
  const goalsQuery = useGoalsQuery(workspaceId, isGoalsViewShown);
  const deleteFavoriteMutation = useDeleteFavoriteMutation(workspaceId);
  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);

  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : [];
  const goals = isGoalsViewShown && Array.isArray(goalsQuery.data) ? goalsQuery.data : [];

  return (
    <GoalsFavoritesSidebar
      favorites={favorites}
      goals={goals}
      showGoals={isGoalsViewShown}
      workspaceId={workspaceId}
      onDeleteFavorite={(favoriteId) => {
        void deleteFavoriteMutation.mutateAsync(favoriteId);
      }}
      onStartFavorite={(fav) => {
        void startTimeEntryMutation.mutateAsync({
          billable: fav.billable,
          description: (fav.description ?? "").trim(),
          projectId: fav.project_id ?? null,
          start: new Date().toISOString(),
          tagIds: fav.tag_ids ?? [],
          taskId: fav.task_id ?? null,
        });
      }}
    />
  );
}
