import { getActiveAnnouncements, getChangelogPublicUrl, getLatestChangelog } from "./content.ts";
import type { CheckResponsePayload } from "./types.ts";

/**
 * Builds the manifest returned by /v1/check and /v1/manifest.
 *
 * `latestTag` is what clients should compare their own version string against;
 * `latestVersion` is the same value without a leading "v" for convenience.
 * Clients that have `version == latestVersion` get `updateAvailable = false`.
 */
export function buildManifest(args: {
  latestTag: string;
  clientVersion?: string;
  now?: Date;
}): CheckResponsePayload {
  const latest = getLatestChangelog();
  const latestTag = normalizeTag(args.latestTag, latest?.tag);
  const latestVersion = stripV(latestTag);
  const clientVersion = args.clientVersion ? stripV(args.clientVersion) : undefined;

  return {
    latestVersion,
    latestTag,
    updateAvailable: clientVersion !== undefined && clientVersion !== latestVersion,
    releasedAt: latest?.date ?? null,
    changelogUrl: getChangelogPublicUrl(),
    announcements: getActiveAnnouncements(args.now),
  };
}

function normalizeTag(envTag: string, changelogTag: string | undefined): string {
  // "latest" is a sentinel meaning "use whatever the newest changelog entry says".
  if (envTag === "latest" || envTag === "") {
    return changelogTag ?? "dev";
  }
  return envTag;
}

function stripV(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}
