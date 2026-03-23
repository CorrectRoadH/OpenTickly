export type WeekShortcutId = "last-week" | "this-week" | "today" | "yesterday";

export type WeekShortcut = {
  id: WeekShortcutId;
  label: string;
  resolveDate: (now: Date) => Date;
};

const DAYS_IN_WEEK = 7;

export const WEEK_SHORTCUTS: WeekShortcut[] = [
  {
    id: "today",
    label: "Today",
    resolveDate: (now) => new Date(now),
  },
  {
    id: "yesterday",
    label: "Yesterday",
    resolveDate: (now) => {
      const date = new Date(now);
      date.setDate(date.getDate() - 1);
      return date;
    },
  },
  {
    id: "this-week",
    label: "This week",
    resolveDate: (now) => new Date(now),
  },
  {
    id: "last-week",
    label: "Last week",
    resolveDate: (now) => {
      const date = new Date(now);
      date.setDate(date.getDate() - DAYS_IN_WEEK);
      return date;
    },
  },
];

export function getWeekDaysForDate(date: Date): Date[] {
  const start = getWeekStart(date);

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const weekday = start.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + delta);
  return start;
}

export function shiftWeek(date: Date, deltaWeeks: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaWeeks * DAYS_IN_WEEK);
  return next;
}

export function formatTrackQueryDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatWeekRangeLabel(date: Date): string {
  const weekDays = getWeekDaysForDate(date);
  return `${formatTrackQueryDate(weekDays[0])} - ${formatTrackQueryDate(weekDays[DAYS_IN_WEEK - 1])}`;
}

export function resolveIsoWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function buildMonthWeeks(visibleMonth: Date): Date[][] {
  const firstDayOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstGridDay = getWeekStart(firstDayOfMonth);
  const weeks: Date[][] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(firstGridDay);
    weekStart.setDate(firstGridDay.getDate() + weekIndex * DAYS_IN_WEEK);
    const week = Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + dayIndex);
      return day;
    });
    weeks.push(week);
  }

  return weeks;
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isSameWeek(left: Date, right: Date): boolean {
  return isSameDay(getWeekStart(left), getWeekStart(right));
}
