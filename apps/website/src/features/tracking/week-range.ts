export type WeekShortcutId =
  | "all-dates"
  | "last-30-days"
  | "last-month"
  | "last-week"
  | "this-month"
  | "this-week"
  | "this-year"
  | "today"
  | "yesterday";

export type WeekShortcut = {
  id: WeekShortcutId;
  label: string;
  resolveDate: (now: Date) => Date;
};

const DAYS_IN_WEEK = 7;

const SHORTCUT_TODAY: WeekShortcut = {
  id: "today",
  label: "Today",
  resolveDate: (now) => new Date(now),
};

const SHORTCUT_YESTERDAY: WeekShortcut = {
  id: "yesterday",
  label: "Yesterday",
  resolveDate: (now) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date;
  },
};

const SHORTCUT_THIS_WEEK: WeekShortcut = {
  id: "this-week",
  label: "This week",
  resolveDate: (now) => new Date(now),
};

const SHORTCUT_LAST_WEEK: WeekShortcut = {
  id: "last-week",
  label: "Last week",
  resolveDate: (now) => {
    const date = new Date(now);
    date.setDate(date.getDate() - DAYS_IN_WEEK);
    return date;
  },
};

const SHORTCUT_THIS_MONTH: WeekShortcut = {
  id: "this-month",
  label: "This month",
  resolveDate: (now) => new Date(now),
};

const SHORTCUT_LAST_MONTH: WeekShortcut = {
  id: "last-month",
  label: "Last month",
  resolveDate: (now) => {
    const date = new Date(now);
    date.setMonth(date.getMonth() - 1);
    return date;
  },
};

const SHORTCUT_THIS_YEAR: WeekShortcut = {
  id: "this-year",
  label: "This year",
  resolveDate: (now) => new Date(now),
};

const SHORTCUT_LAST_30_DAYS: WeekShortcut = {
  id: "last-30-days",
  label: "Last 30 days",
  resolveDate: (now) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 30);
    return date;
  },
};

const SHORTCUT_ALL_DATES: WeekShortcut = {
  id: "all-dates",
  label: "All dates",
  resolveDate: (now) => new Date(now),
};

export const WEEK_SHORTCUTS: WeekShortcut[] = [
  SHORTCUT_TODAY,
  SHORTCUT_YESTERDAY,
  SHORTCUT_THIS_WEEK,
  SHORTCUT_LAST_WEEK,
  SHORTCUT_LAST_30_DAYS,
  SHORTCUT_ALL_DATES,
];

export const REPORTS_SHORTCUTS: WeekShortcut[] = [
  SHORTCUT_THIS_WEEK,
  SHORTCUT_LAST_WEEK,
  SHORTCUT_THIS_MONTH,
  SHORTCUT_LAST_MONTH,
  SHORTCUT_THIS_YEAR,
];

/**
 * Resolves a shortcut ID into a date range { startDate, endDate } as YYYY-MM-DD strings.
 * Used by Reports and other consumers that need a start/end range rather than a single date.
 */
export function resolveShortcutRange(
  shortcutId: WeekShortcutId,
  weekStartsOn = 1,
  now = new Date(),
): { endDate: string; startDate: string } {
  switch (shortcutId) {
    case "today": {
      const key = formatTrackQueryDate(now);
      return { endDate: key, startDate: key };
    }
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const key = formatTrackQueryDate(d);
      return { endDate: key, startDate: key };
    }
    case "this-week": {
      const days = getWeekDaysForDate(now, weekStartsOn);
      return { endDate: formatTrackQueryDate(days[6]), startDate: formatTrackQueryDate(days[0]) };
    }
    case "last-week": {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - DAYS_IN_WEEK);
      const days = getWeekDaysForDate(lastWeek, weekStartsOn);
      return { endDate: formatTrackQueryDate(days[6]), startDate: formatTrackQueryDate(days[0]) };
    }
    case "this-month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { endDate: formatTrackQueryDate(last), startDate: formatTrackQueryDate(first) };
    }
    case "last-month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { endDate: formatTrackQueryDate(last), startDate: formatTrackQueryDate(first) };
    }
    case "this-year": {
      const first = new Date(now.getFullYear(), 0, 1);
      return { endDate: formatTrackQueryDate(now), startDate: formatTrackQueryDate(first) };
    }
    case "last-30-days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { endDate: formatTrackQueryDate(now), startDate: formatTrackQueryDate(start) };
    }
    case "all-dates":
      return { endDate: formatTrackQueryDate(now), startDate: "2006-01-01" };
  }
}

export function getWeekDaysForDate(date: Date, weekStartsOn = 1): Date[] {
  const start = getWeekStart(date, weekStartsOn);

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/**
 * Returns the start of the week containing `date`.
 * `weekStartsOn` uses JS getDay() convention: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getWeekStart(date: Date, weekStartsOn = 1): Date {
  const start = new Date(date);
  const weekday = start.getDay();
  const delta = ((weekday - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK) * -1;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + delta);
  return start;
}

export function shiftWeek(date: Date, deltaWeeks: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaWeeks * DAYS_IN_WEEK);
  return next;
}

export function shiftDay(date: Date, deltaDays: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

/**
 * Formats a day label for the day-view range picker trigger.
 * Returns "Today · Thu", "Yesterday · Wed", or "Mar 26, 2026" for other dates.
 */
export function formatDayLabel(date: Date): string {
  const today = new Date();
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);

  if (isSameDay(date, today)) {
    return `Today \u00B7 ${dayName}`;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday \u00B7 ${dayName}`;
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatTrackQueryDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatWeekRangeLabel(date: Date, weekStartsOn = 1): string {
  const weekDays = getWeekDaysForDate(date, weekStartsOn);
  const weekStart = getWeekStart(date, weekStartsOn);
  const weekNumber = resolveIsoWeekNumber(date);
  const today = new Date();
  const todayWeekStart = getWeekStart(today, weekStartsOn);

  if (isSameDay(weekStart, todayWeekStart)) {
    return `This week · W${weekNumber}`;
  }

  const lastWeekStart = shiftWeek(todayWeekStart, -1);
  if (isSameDay(weekStart, lastWeekStart)) {
    return `Last week · W${weekNumber}`;
  }

  const start = weekDays[0];
  const end = weekDays[DAYS_IN_WEEK - 1];
  const startMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(end);

  if (start.getMonth() === end.getMonth()) {
    return `W${weekNumber} (${startMonth} ${start.getDate()} - ${end.getDate()})`;
  }

  return `W${weekNumber} (${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()})`;
}

export function resolveIsoWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function buildMonthWeeks(visibleMonth: Date, weekStartsOn = 1): Date[][] {
  const firstDayOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstGridDay = getWeekStart(firstDayOfMonth, weekStartsOn);
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

export function isSameWeek(left: Date, right: Date, weekStartsOn = 1): boolean {
  return isSameDay(getWeekStart(left, weekStartsOn), getWeekStart(right, weekStartsOn));
}
