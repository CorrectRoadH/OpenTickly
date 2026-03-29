/**
 * Format helpers that mirror the app's default preference formatting.
 * If the default preference changes, update these — all E2E assertions follow.
 */

/** Default = "improved" → "H:MM:SS" */
export function expectedDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
