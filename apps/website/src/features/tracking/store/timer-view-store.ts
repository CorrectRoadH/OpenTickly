import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { CalendarSubview, TimerInputMode, TimerViewMode } from "../timer-view-mode.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DateRange {
  startDate: string;
  endDate: string;
}

interface TimerViewState {
  view: TimerViewMode;
  calendarSubview: CalendarSubview;
  timerInputMode: TimerInputMode;
  calendarZoom: number;
  selectedWeekDate: Date;
  listDateRange: DateRange | null;
}

interface TimerViewActions {
  setView: (next: TimerViewMode) => void;
  setCalendarSubview: (next: CalendarSubview) => void;
  setTimerInputMode: (next: TimerInputMode) => void;
  setCalendarZoom: (zoom: number) => void;
  setSelectedWeekDate: (date: Date) => void;
  setListDateRange: (range: DateRange | null) => void;
}

// Only view preferences are persisted; calendarZoom is transient.
type PersistedViewState = Pick<TimerViewState, "view" | "calendarSubview" | "timerInputMode">;

// ---------------------------------------------------------------------------
// Custom storage adapter — reads/writes the 3 legacy localStorage keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  view: "opentoggl:user-prefs:timer-view",
  calendarSubview: "opentoggl:user-prefs:calendar-subview",
  timerInputMode: "opentoggl:user-prefs:timer-input-mode",
} as const;

const VALID_VALUES = {
  view: new Set<string>(["calendar", "list", "timesheet"]),
  calendarSubview: new Set<string>(["day", "five-day", "week"]),
  timerInputMode: new Set<string>(["automatic", "manual"]),
} as const;

const DEFAULTS: PersistedViewState = {
  view: "calendar",
  calendarSubview: "week",
  timerInputMode: "automatic",
};

function readKey<K extends keyof PersistedViewState>(key: K): PersistedViewState[K] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (raw != null && VALID_VALUES[key].has(raw)) {
      return raw as PersistedViewState[K];
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULTS[key];
}

function writeKey<K extends keyof PersistedViewState>(key: K, value: PersistedViewState[K]): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], value);
  } catch {
    // localStorage unavailable or full
  }
}

const legacyStorage: PersistStorage<PersistedViewState> = {
  getItem(): StorageValue<PersistedViewState> {
    return {
      state: {
        view: readKey("view"),
        calendarSubview: readKey("calendarSubview"),
        timerInputMode: readKey("timerInputMode"),
      },
    };
  },

  setItem(_name: string, value: StorageValue<PersistedViewState>): void {
    const s = value.state;
    writeKey("view", s.view);
    writeKey("calendarSubview", s.calendarSubview);
    writeKey("timerInputMode", s.timerInputMode);
  },

  removeItem(): void {
    for (const storageKey of Object.values(STORAGE_KEYS)) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTimerViewStore = create<TimerViewState & TimerViewActions>()(
  persist(
    immer((set) => ({
      // State
      view: DEFAULTS.view,
      calendarSubview: DEFAULTS.calendarSubview,
      timerInputMode: DEFAULTS.timerInputMode,
      calendarZoom: 0,
      selectedWeekDate: new Date(),
      listDateRange: null,

      // Actions
      setView: (next) =>
        set((state) => {
          state.view = next;
          if (next === "list") {
            state.listDateRange = null;
          }
        }),

      setCalendarSubview: (next) =>
        set((state) => {
          state.calendarSubview = next;
        }),

      setTimerInputMode: (next) =>
        set((state) => {
          state.timerInputMode = next;
        }),

      setCalendarZoom: (zoom) =>
        set((state) => {
          state.calendarZoom = Math.max(-1, Math.min(1, zoom));
        }),

      setSelectedWeekDate: (date) =>
        set((state) => {
          state.selectedWeekDate = date;
        }),

      setListDateRange: (range) =>
        set((state) => {
          state.listDateRange = range;
        }),
    })),
    {
      name: "opentoggl:timer-view",
      storage: legacyStorage,
      partialize: (state): PersistedViewState => ({
        view: state.view,
        calendarSubview: state.calendarSubview,
        timerInputMode: state.timerInputMode,
      }),
    },
  ),
);
