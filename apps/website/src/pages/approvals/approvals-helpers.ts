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

/**
 * Determines whether the given date falls within the current calendar week.
 */
export function isCurrentWeek(date: Date): boolean {
  const now = new Date();
  const currentStart = getWeekStart(now);
  const targetStart = getWeekStart(date);
  return currentStart.getTime() === targetStart.getTime();
}
