export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  id: string;
  title: string;
  severity: AnnouncementSeverity;
  publishedAt: string; // ISO date
  expiresAt: string | null;
  link: string | null;
  bodyMarkdown: string;
}

/**
 * The response shape for `GET update.opentoggl.com/`.
 *
 * Describes just the latest release — clients that want the full history click
 * through to `releaseUrl` on GitHub. Announcements are a separate, time-bounded
 * cross-release channel (see `content/announcements/*.md`).
 */
export interface UpdateResponse {
  latestVersion: string;
  latestTag: string;
  /** `true` only when the caller passed `?version=...` and it doesn't match `latestVersion`. */
  updateAvailable: boolean;
  releasedAt: string | null;
  releaseUrl: string | null;
  releaseNotes: string;
  /** Active announcements (expired filtered out). */
  announcements: Announcement[];
}

/**
 * Worker env bindings. Keep in sync with wrangler.toml.
 *
 * `UPDATE_REQUESTS` is the Analytics Engine dataset that records one data
 * point per client call with a valid `instanceId` + `version`. It's declared
 * optional so the worker still boots if the binding is ever removed —
 * `recordUpdateRequest` guards on undefined.
 *
 * `GITHUB_TOKEN` is optional — only needed if the public 60/hr/IP anonymous
 * rate limit isn't enough. Set via `wrangler secret put GITHUB_TOKEN`.
 */
export interface WorkerEnv {
  UPDATE_REQUESTS?: AnalyticsEngineDataset;
  GITHUB_REPO: string;
  GITHUB_TOKEN?: string;
}
