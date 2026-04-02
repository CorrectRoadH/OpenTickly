import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../../shared/api/generated/public-track/types.gen.ts";
import type { TimeEntryEditorAnchor } from "../TimeEntryEditorDialog.tsx";
import type { TimerComposerSuggestionsAnchor } from "../TimerComposerSuggestionsDialog.tsx";
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

  // Editor popup state
  selectedEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  selectedEntryAnchor: TimeEntryEditorAnchor | null;
  isNewEntry: boolean;
  calendarDraftEntry: GithubComTogglTogglApiInternalModelsTimeEntry | null;

  // Composer draft state
  draftDescription: string;
  draftProjectId: number | null;
  draftTagIds: number[];
  draftBillable: boolean;
  runningDescription: string;
  composerSuggestionsAnchor: TimerComposerSuggestionsAnchor | null;
}

interface TimerViewActions {
  setView: (next: TimerViewMode) => void;
  setCalendarSubview: (next: CalendarSubview) => void;
  setTimerInputMode: (next: TimerInputMode) => void;
  setCalendarZoom: (zoom: number) => void;
  setSelectedWeekDate: (date: Date) => void;
  setListDateRange: (range: DateRange | null) => void;

  // Editor popup actions
  setSelectedEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry | null) => void;
  setSelectedEntryAnchor: (anchor: TimeEntryEditorAnchor | null) => void;
  setIsNewEntry: (isNew: boolean) => void;
  setCalendarDraftEntry: (entry: GithubComTogglTogglApiInternalModelsTimeEntry | null) => void;
  closeEditor: () => void;

  // Composer draft actions
  setDraftDescription: (desc: string) => void;
  setDraftProjectId: (id: number | null) => void;
  setDraftTagIds: (ids: number[]) => void;
  setDraftBillable: (billable: boolean) => void;
  setRunningDescription: (desc: string) => void;
  setComposerSuggestionsAnchor: (anchor: TimerComposerSuggestionsAnchor | null) => void;
  clearDraft: () => void;
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

      // Editor popup state
      selectedEntry: null,
      selectedEntryAnchor: null,
      isNewEntry: false,
      calendarDraftEntry: null,

      // Composer draft state
      draftDescription: "",
      draftProjectId: null,
      draftTagIds: [],
      draftBillable: false,
      runningDescription: "",
      composerSuggestionsAnchor: null,

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

      // Editor popup actions
      setSelectedEntry: (entry) =>
        set((state) => {
          state.selectedEntry = entry as any;
        }),

      setSelectedEntryAnchor: (anchor) =>
        set((state) => {
          state.selectedEntryAnchor = anchor as any;
        }),

      setIsNewEntry: (isNew) =>
        set((state) => {
          state.isNewEntry = isNew;
        }),

      setCalendarDraftEntry: (entry) =>
        set((state) => {
          state.calendarDraftEntry = entry as any;
        }),

      closeEditor: () =>
        set((state) => {
          state.selectedEntry = null;
          state.selectedEntryAnchor = null;
          state.isNewEntry = false;
          state.calendarDraftEntry = null;
        }),

      // Composer draft actions
      setDraftDescription: (desc) =>
        set((state) => {
          state.draftDescription = desc;
        }),

      setDraftProjectId: (id) =>
        set((state) => {
          state.draftProjectId = id;
        }),

      setDraftTagIds: (ids) =>
        set((state) => {
          state.draftTagIds = ids;
        }),

      setDraftBillable: (billable) =>
        set((state) => {
          state.draftBillable = billable;
        }),

      setRunningDescription: (desc) =>
        set((state) => {
          state.runningDescription = desc;
        }),

      setComposerSuggestionsAnchor: (anchor) =>
        set((state) => {
          state.composerSuggestionsAnchor = anchor as any;
        }),

      clearDraft: () =>
        set((state) => {
          state.draftDescription = "";
          state.draftProjectId = null;
          state.draftTagIds = [];
          state.draftBillable = false;
          state.composerSuggestionsAnchor = null;
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
