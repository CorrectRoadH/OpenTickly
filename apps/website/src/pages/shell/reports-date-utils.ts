import i18n from "../../app/i18n.ts";
import { formatDateKey } from "../../features/tracking/overview-data.ts";

export type ReportsTimePeriod =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year";

export type ReportsDateRange = {
  endDate: string;
  startDate: string;
};

/**
 * Computes the date range for a named time period relative to the user's
 * timezone and week-start preference.
 */
export function getDateRangeForPeriod(
  period: ReportsTimePeriod,
  timezone: string,
  weekStartsOn: number,
  now?: Date,
): ReportsDateRange {
  const refDate = now ?? new Date();

  if (period === "this_week") {
    const keys = getWeekDateKeys(timezone, weekStartsOn, refDate);
    return { endDate: keys[keys.length - 1]!, startDate: keys[0]! };
  }

  if (period === "last_week") {
    const lastWeek = new Date(refDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const keys = getWeekDateKeys(timezone, weekStartsOn, lastWeek);
    return { endDate: keys[keys.length - 1]!, startDate: keys[0]! };
  }

  const todayKey = formatDateKey(refDate, timezone);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  if (period === "this_month") {
    const first = new Date(Date.UTC(year, month, 1));
    const last = new Date(Date.UTC(year, month + 1, 0));
    return {
      endDate: last.toISOString().slice(0, 10),
      startDate: first.toISOString().slice(0, 10),
    };
  }

  if (period === "last_month") {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0));
    return {
      endDate: last.toISOString().slice(0, 10),
      startDate: first.toISOString().slice(0, 10),
    };
  }

  // this_year
  const first = new Date(Date.UTC(year, 0, 1));
  return {
    endDate: todayKey,
    startDate: first.toISOString().slice(0, 10),
  };
}

/**
 * Shifts a date range forward or backward by the span of the range itself.
 */
export function shiftWeekRange(
  range: ReportsDateRange,
  direction: "prev" | "next",
): ReportsDateRange {
  const start = new Date(`${range.startDate}T00:00:00Z`);
  const end = new Date(`${range.endDate}T00:00:00Z`);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const offset = direction === "prev" ? -spanDays : spanDays;
  start.setUTCDate(start.getUTCDate() + offset);
  end.setUTCDate(end.getUTCDate() + offset);
  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

export function getDateRangeKeys(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const keys: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    keys.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return keys;
}

export function getWeekDateKeys(
  timezone: string,
  weekStartsOn: number,
  now = new Date(),
): string[] {
  const todayKey = formatDateKey(now, timezone);
  const todayDate = new Date(`${todayKey}T00:00:00Z`);
  const weekday = todayDate.getUTCDay();
  const normalized = normalizeWeekStart(weekStartsOn);
  const offset = (weekday - normalized + 7) % 7;
  const startDate = new Date(todayDate);
  startDate.setUTCDate(todayDate.getUTCDate() - offset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startDate);
    day.setUTCDate(startDate.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function getIsoWeekNumber(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));

  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatRangeDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function normalizeWeekStart(weekStartsOn: number): number {
  if (weekStartsOn >= 0 && weekStartsOn <= 6) {
    return weekStartsOn;
  }
  return 1;
}
