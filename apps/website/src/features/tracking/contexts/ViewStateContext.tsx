import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { CalendarSubview, TimerInputMode, TimerViewMode } from "../timer-view-mode.ts";
import { formatTrackQueryDate, getWeekDaysForDate } from "../week-range.ts";
import { useWorkspaceContext } from "./WorkspaceContext.tsx";
import {
  loadPersistedCalendarSubview,
  loadPersistedTimerInputMode,
  loadPersistedTimerView,
  persistCalendarSubview,
  persistTimerInputMode,
  persistTimerView,
} from "./timer-page-utils.ts";

const LIST_INITIAL_DAYS = 9;
const LIST_PAGE_INCREMENT = 7;

export interface ViewStateContextValue {
  view: TimerViewMode;
  setView: (next: TimerViewMode) => void;
  calendarSubview: CalendarSubview;
  setCalendarSubview: (next: CalendarSubview) => void;
  timerInputMode: TimerInputMode;
  setTimerInputMode: (next: TimerInputMode) => void;
  calendarZoom: number;
  setCalendarZoom: (zoom: number) => void;

  selectedWeekDate: Date;
  setSelectedWeekDate: (date: Date) => void;
  weekDays: Date[];
  weekRange: { startDate: string; endDate: string };

  listDateRange: { startDate: string; endDate: string } | null;
  setListDateRange: (range: { startDate: string; endDate: string } | null) => void;
  listQueryRange: { startDate: string; endDate: string };
  hasMoreEntries: boolean;
  isLoadingMoreEntries: boolean;
  loadMoreEntries: () => void;
  listDaysLoaded: number;
}

const ViewStateCtx = createContext<ViewStateContextValue | null>(null);

export function ViewStateProvider({
  children,
  initialDate,
}: {
  children: ReactNode;
  initialDate?: Date;
}) {
  const { beginningOfWeek } = useWorkspaceContext();

  const [view, setViewState] = useState<TimerViewMode>(loadPersistedTimerView);
  const setView = useCallback((next: TimerViewMode) => {
    persistTimerView(next);
    setViewState(next);
    if (next === "list") {
      setListDateRange(null);
    }
  }, []);

  const [calendarSubview, setCalendarSubviewState] = useState<CalendarSubview>(
    loadPersistedCalendarSubview,
  );
  const setCalendarSubview = useCallback((next: CalendarSubview) => {
    persistCalendarSubview(next);
    setCalendarSubviewState(next);
  }, []);

  const [timerInputMode, setTimerInputModeState] = useState<TimerInputMode>(
    loadPersistedTimerInputMode,
  );
  const setTimerInputMode = useCallback((next: TimerInputMode) => {
    persistTimerInputMode(next);
    setTimerInputModeState(next);
  }, []);

  const [calendarZoom, setCalendarZoomState] = useState(0);
  const setCalendarZoom = useCallback((zoom: number) => {
    setCalendarZoomState(Math.max(-1, Math.min(1, zoom)));
  }, []);

  const [listDateRange, setListDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [listDaysLoaded, setListDaysLoaded] = useState(LIST_INITIAL_DAYS);
  const loadMoreEntries = useCallback(() => {
    setListDaysLoaded((prev) => prev + LIST_PAGE_INCREMENT);
  }, []);

  const [selectedWeekDate, setSelectedWeekDate] = useState(() => initialDate ?? new Date());

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

  const hasMoreEntries = listDateRange === null;
  const isLoadingMoreEntries = false; // Will be updated by TimeEntriesContext

  const value = useMemo<ViewStateContextValue>(
    () => ({
      view,
      setView,
      calendarSubview,
      setCalendarSubview,
      timerInputMode,
      setTimerInputMode,
      calendarZoom,
      setCalendarZoom,
      selectedWeekDate,
      setSelectedWeekDate,
      weekDays,
      weekRange,
      listDateRange,
      setListDateRange,
      listQueryRange,
      hasMoreEntries,
      isLoadingMoreEntries,
      loadMoreEntries,
      listDaysLoaded,
    }),
    [
      view,
      setView,
      calendarSubview,
      setCalendarSubview,
      timerInputMode,
      setTimerInputMode,
      calendarZoom,
      setCalendarZoom,
      selectedWeekDate,
      weekDays,
      weekRange,
      listDateRange,
      listQueryRange,
      hasMoreEntries,
      loadMoreEntries,
      listDaysLoaded,
    ],
  );

  return <ViewStateCtx.Provider value={value}>{children}</ViewStateCtx.Provider>;
}

export function useViewStateContext(): ViewStateContextValue {
  const ctx = useContext(ViewStateCtx);
  if (!ctx) {
    throw new Error("ViewStateProvider is required");
  }
  return ctx;
}
