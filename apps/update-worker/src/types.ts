export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  id: string;
  title: string;
  severity: AnnouncementSeverity;
  publishedAt: string; // ISO date (YYYY-MM-DD or full ISO)
  expiresAt: string | null;
  link: string | null;
  bodyMarkdown: string;
}

export interface ChangelogEntry {
  tag: string; // e.g. "0.3.1"
  date: string; // ISO date
  title: string;
  bodyMarkdown: string;
}

export interface CheckRequestPayload {
  instanceId: string;
  version: string;
  goVersion?: string;
  os?: string;
  arch?: string;
  locale?: string;
}

export interface CheckResponsePayload {
  latestVersion: string;
  latestTag: string;
  updateAvailable: boolean;
  releasedAt: string | null;
  changelogUrl: string;
  announcements: Announcement[];
}

/**
 * Worker env bindings. Keep in sync with wrangler.toml.
 */
export interface WorkerEnv {
  ANALYTICS: AnalyticsEngineDataset;
  LATEST_TAG: string;
  CHECK_RATE_LIMIT_PER_MIN: string;
}
