import type {
  GithubComTogglTogglApiInternalModelsProject,
  GithubComTogglTogglApiInternalModelsTimeEntry,
} from "../../../shared/api/generated/public-track/types.gen.ts";
import { WebApiError } from "../../../shared/api/web-client.ts";
import type { CalendarSubview, TimerInputMode, TimerViewMode } from "../timer-view-mode.ts";

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const TIMER_VIEW_STORAGE_KEY = "opentoggl:user-prefs:timer-view";

export function loadPersistedTimerView(): TimerViewMode {
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

export function persistTimerView(view: TimerViewMode): void {
  try {
    localStorage.setItem(TIMER_VIEW_STORAGE_KEY, view);
  } catch {
    // localStorage not available or write error
  }
}

const CALENDAR_SUBVIEW_STORAGE_KEY = "opentoggl:user-prefs:calendar-subview";

export function loadPersistedCalendarSubview(): CalendarSubview {
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

export function persistCalendarSubview(subview: CalendarSubview): void {
  try {
    localStorage.setItem(CALENDAR_SUBVIEW_STORAGE_KEY, subview);
  } catch {
    // localStorage not available or write error
  }
}

const TIMER_INPUT_MODE_STORAGE_KEY = "opentoggl:user-prefs:timer-input-mode";

export function loadPersistedTimerInputMode(): TimerInputMode {
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

export function persistTimerInputMode(mode: TimerInputMode): void {
  try {
    localStorage.setItem(TIMER_INPUT_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage not available or write error
  }
}

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

export function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return entry.stop == null || (entry.duration ?? 0) < 0;
}

export function areNumberListsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function toTrackIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

export function resolveSingleTimerErrorMessage(error: unknown): string {
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

// ---------------------------------------------------------------------------
// Data normalization
// ---------------------------------------------------------------------------

export function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
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

export function normalizeTags(data: unknown): { id: number; name: string }[] {
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
