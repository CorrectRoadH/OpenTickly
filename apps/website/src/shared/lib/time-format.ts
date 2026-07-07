/**
 * Formats an ISO timestamp as a local "HH:MM" clock time.
 * Returns "-" for missing or unparsable input.
 */
export function formatTimeHHMM(isoString: string | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
