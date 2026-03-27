export type ApprovalsTab = "team" | "yours";
export type StatusFilter = "pending" | "changes_requested" | "approved" | "not_submitted";

export const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  not_submitted: "Not submitted",
};

/**
 * Maps the local StatusFilter value to the API statuses query parameter.
 */
export function statusFilterToApiParam(filter: StatusFilter): string {
  switch (filter) {
    case "pending":
      return "pending";
    case "changes_requested":
      return "changes_requested";
    case "approved":
      return "approved";
    case "not_submitted":
      return "not_submitted";
  }
}

/**
 * Returns the Monday of the ISO week that contains the given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the Sunday of the ISO week that contains the given date.
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Returns the ISO week number for a given date.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.round(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + yearStart.getDay() + 6) / 7,
  );
}

export function formatDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format a period string for display, e.g. "Mar 24 - Mar 30".
 */
export function formatPeriod(startDate: string | undefined, endDate: string | undefined): string {
  if (!startDate) return "-";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const startStr = `${monthNames[start.getMonth()]} ${start.getDate()}`;
  if (!end) return startStr;
  const endStr = `${monthNames[end.getMonth()]} ${end.getDate()}`;
  return `${startStr} - ${endStr}`;
}

/**
 * Format minutes as HH:MM.
 */
export function formatHours(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return "0:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Determines whether the given date falls within the current calendar week.
 */
export function isCurrentWeek(date: Date): boolean {
  const now = new Date();
  const currentStart = getWeekStart(now);
  const targetStart = getWeekStart(date);
  return currentStart.getTime() === targetStart.getTime();
}
