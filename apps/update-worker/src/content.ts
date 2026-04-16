import type { Announcement } from "./types.ts";
import { generatedAnnouncements } from "./content.generated.ts";

/**
 * Returns announcements whose `expiresAt` is still in the future (or missing).
 * Changelog used to be baked in too — that's now sourced live from GitHub
 * releases (see src/github.ts).
 */
export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  const nowTs = now.getTime();
  return generatedAnnouncements.filter((a) => {
    if (!a.expiresAt) return true;
    const exp = Date.parse(a.expiresAt);
    return Number.isNaN(exp) ? true : exp >= nowTs;
  });
}
