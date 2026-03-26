const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type TimerSearch = {
  date?: unknown;
};

export type ParsedTimerSearch = {
  date?: string;
};

/**
 * Parses the ?date=YYYY-MM-DD search param for the /timer route.
 * Returns a validated date string or undefined.
 */
export function parseTimerSearch(search: TimerSearch | undefined): ParsedTimerSearch {
  const raw = search?.date;
  if (typeof raw !== "string" || !DATE_PATTERN.test(raw)) {
    return {};
  }

  // Verify the string is a real calendar date (not 2026-02-30 etc.)
  const parsed = new Date(raw + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) {
    return {};
  }

  return { date: raw };
}

/**
 * Converts a validated YYYY-MM-DD string into a local-midnight Date,
 * or returns undefined if the string is absent/invalid.
 */
export function resolveTimerSearchDate(date: string | undefined): Date | undefined {
  if (date == null) {
    return undefined;
  }
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
