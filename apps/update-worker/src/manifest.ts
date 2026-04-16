import type { GithubRelease } from "./github.ts";
import type { Announcement, UpdateResponse } from "./types.ts";

/**
 * Builds the `UpdateResponse` the Worker returns. Only the latest non-draft
 * release drives the response — the full history is intentionally omitted so
 * the payload stays small. Clients curious about older releases follow
 * `releaseUrl` to github.com.
 *
 * `updateAvailable` is only true when the caller passed `?version=...` AND it
 * doesn't match. Callers without a version always see `false` so clients can't
 * mistake "no context" for "up to date".
 */
export function buildManifest(args: {
  releases: GithubRelease[];
  announcements: Announcement[];
  clientVersion?: string;
}): UpdateResponse {
  const latest = args.releases.find((r) => !r.draft);
  const latestTag = latest?.tag_name ?? "";
  const latestVersion = stripV(latestTag);
  const client = args.clientVersion ? stripV(args.clientVersion) : undefined;

  return {
    latestVersion,
    latestTag,
    updateAvailable: client !== undefined && latestVersion !== "" && client !== latestVersion,
    releasedAt: latest?.published_at || null,
    releaseUrl: latest?.html_url ?? null,
    releaseNotes: latest?.body ?? "",
    announcements: args.announcements,
  };
}

function stripV(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}
