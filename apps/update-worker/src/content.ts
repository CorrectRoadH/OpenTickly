import type { Announcement, ChangelogEntry } from "./types.ts";
import { generatedAnnouncements, generatedChangelog } from "./content.generated.ts";

const CHANGELOG_PUBLIC_URL = "https://github.com/CorrectRoadH/opentoggl/blob/main/CHANGELOG.md";

export function getChangelog(): ChangelogEntry[] {
  return generatedChangelog;
}

export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  const nowTs = now.getTime();
  return generatedAnnouncements.filter((a) => {
    if (!a.expiresAt) return true;
    const exp = Date.parse(a.expiresAt);
    return Number.isNaN(exp) ? true : exp >= nowTs;
  });
}

export function getLatestChangelog(): ChangelogEntry | null {
  const entries = getChangelog();
  return entries[0] ?? null;
}

export function getChangelogPublicUrl(): string {
  return CHANGELOG_PUBLIC_URL;
}
