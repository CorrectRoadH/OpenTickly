import { AppLinkButton, AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, Megaphone, Zap } from "lucide-react";

import i18n from "../../app/i18n.ts";
import type { InstanceAnnouncement } from "../../shared/api/generated/admin/types.gen.ts";
import {
  useInstanceHealthQuery,
  useInstanceVersionQuery,
} from "../../shared/query/instance-admin.ts";

function GithubIcon({ className, ...props }: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function AdminOverviewTab(): ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <OnboardingBanner />
      <VersionCard />
      <AnnouncementsSection />
      <HealthSection />
    </div>
  );
}

function OnboardingBanner(): ReactElement {
  const { t } = useTranslation();

  return (
    <SurfaceCard>
      <div className="flex items-start gap-5 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--track-accent)]/10 text-[24px]">
          <Zap
            aria-hidden="true"
            className="h-7 w-7 text-[var(--track-accent)]"
            size={28}
            strokeWidth={2}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:welcomeToOpenToggl")}
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--track-text-muted)]">
            {t("instanceAdmin:welcomeDescription")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <AppLinkButton
              href="https://github.com/CorrectRoadH/opentoggl"
              rel="noopener noreferrer"
              target="_blank"
              variant="primary"
            >
              <GithubIcon aria-hidden="true" className="h-5 w-5" />
              {t("instanceAdmin:starOnGithub")}
            </AppLinkButton>
            <AppLinkButton
              href="https://github.com/CorrectRoadH/opentoggl/issues"
              target="_blank"
              variant="ghost"
            >
              {t("instanceAdmin:reportAnIssue")}
            </AppLinkButton>
            <AppLinkButton
              href="https://github.com/CorrectRoadH/opentoggl/blob/main/CHANGELOG.md"
              target="_blank"
              variant="ghost"
            >
              {t("instanceAdmin:changelog")}
            </AppLinkButton>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function VersionCard(): ReactElement {
  const { t } = useTranslation();
  const versionQuery = useInstanceVersionQuery();

  if (versionQuery.isPending) {
    return (
      <SurfaceCard>
        <div className="flex items-center gap-3 p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--track-border)]" />
        </div>
      </SurfaceCard>
    );
  }

  const version = versionQuery.data;

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-[var(--track-text)]">
              OpenToggl v{version?.current_version ?? "unknown"}
            </span>
            {version?.update_available ? (
              <span className="rounded-full bg-[var(--track-accent)]/15 px-2.5 py-0.5 text-[12px] font-medium text-[var(--track-accent)]">
                {t("instanceAdmin:updateAvailable", { version: version.latest_version })}
              </span>
            ) : (
              <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[12px] font-medium text-green-400">
                {t("instanceAdmin:upToDate")}
              </span>
            )}
          </div>
          {version?.released_at ? (
            <div className="mt-1 text-[12px] text-[var(--track-text-muted)]">
              {t("instanceAdmin:releasedOn", {
                date: new Date(version.released_at).toLocaleDateString(i18n.language),
              })}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {version?.update_available && version.release_url ? (
            <AppLinkButton href={version.release_url} target="_blank" variant="primary" size="sm">
              {t("instanceAdmin:viewRelease")}
            </AppLinkButton>
          ) : null}
          {version?.changelog_url ? (
            <AppLinkButton href={version.changelog_url} target="_blank" variant="ghost" size="sm">
              {t("instanceAdmin:changelog")}
            </AppLinkButton>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}

// AnnouncementsSection renders the list of active announcements surfaced by
// the upstream update worker. The data rides the same query as VersionCard —
// empty lists collapse the section entirely so admins without notices see a
// clean page.
function AnnouncementsSection(): ReactElement | null {
  const { t } = useTranslation();
  const versionQuery = useInstanceVersionQuery();
  const announcements = versionQuery.data?.announcements;

  if (!announcements || announcements.length === 0) return null;

  return (
    <SurfaceCard>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone
            aria-hidden="true"
            className="h-4 w-4 text-[var(--track-text-muted)]"
            size={16}
          />
          <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:announcements")}
          </h3>
        </div>
        <ul className="flex flex-col gap-3">
          {announcements.map((a) => (
            <AnnouncementItem key={a.id} announcement={a} />
          ))}
        </ul>
      </div>
    </SurfaceCard>
  );
}

const announcementAccentBySeverity: Record<InstanceAnnouncement["severity"], string> = {
  info: "border-l-[var(--track-accent)] bg-[var(--track-accent)]/5",
  warning: "border-l-yellow-400 bg-yellow-500/5",
  critical: "border-l-red-400 bg-red-500/10",
};

function AnnouncementItem({ announcement }: { announcement: InstanceAnnouncement }): ReactElement {
  const { t } = useTranslation();
  const accent = announcementAccentBySeverity[announcement.severity];
  const SeverityIcon = announcement.severity === "info" ? Info : AlertTriangle;

  return (
    <li
      className={`flex flex-col gap-2 rounded-md border border-[var(--track-border)] border-l-4 p-4 ${accent}`}
    >
      <div className="flex items-center gap-2">
        <SeverityIcon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--track-text-muted)]"
          size={16}
        />
        <span className="text-[14px] font-medium text-[var(--track-text)]">
          {announcement.title}
        </span>
        <span className="ml-auto text-[12px] text-[var(--track-text-muted)]">
          {new Date(announcement.published_at).toLocaleDateString(i18n.language)}
        </span>
      </div>
      {announcement.body_markdown ? (
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--track-text-soft)]">
          {announcement.body_markdown}
        </p>
      ) : null}
      {announcement.link ? (
        <div>
          <AppLinkButton
            href={announcement.link}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
          >
            {t("instanceAdmin:announcementLearnMore")}
          </AppLinkButton>
        </div>
      ) : null}
    </li>
  );
}

function HealthSection(): ReactElement {
  const { t } = useTranslation();
  const healthQuery = useInstanceHealthQuery();

  if (healthQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:loadingHealth")}
          title={t("instanceAdmin:health")}
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:couldNotLoadHealth")}
          title={t("instanceAdmin:healthUnavailable")}
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const health = healthQuery.data;

  return (
    <>
      <SurfaceCard>
        <div className="p-5">
          <h3 className="mb-4 text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:instanceHealth")}
          </h3>
          <div className="flex items-center gap-3">
            <StatusBadge status={health.status} />
            <span className="text-[14px] text-[var(--track-text-soft)]">
              {t("instanceAdmin:checkedAt", {
                time: new Date(health.checked_at).toLocaleTimeString(i18n.language),
              })}
            </span>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("instanceAdmin:usersLabel")} value={health.user_count} />
        <StatCard label={t("instanceAdmin:jobBacklog")} value={health.job_backlog} />
        <DependencyCard label={t("instanceAdmin:database")} dep={health.database} />
        <DependencyCard label={t("instanceAdmin:redis")} dep={health.redis} />
      </div>
    </>
  );
}

const statusBadgeColors: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-400",
  degraded: "bg-yellow-500/20 text-yellow-400",
  unhealthy: "bg-red-500/20 text-red-400",
};

function StatusBadge({ status }: { status: string }): ReactElement {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${statusBadgeColors[status] ?? "bg-gray-500/20 text-gray-400"}`}
    >
      {t(`instanceAdmin:${status}`)}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <SurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[24px] font-semibold text-[var(--track-text)]">{value}</div>
      </div>
    </SurfaceCard>
  );
}

function DependencyCard({
  label,
  dep,
}: {
  label: string;
  dep: { status: string; latency_ms?: number };
}): ReactElement {
  const { t } = useTranslation();
  const isUp = dep.status === "up";

  return (
    <SurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isUp ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-[14px] text-[var(--track-text)]">
            {t(isUp ? "instanceAdmin:up" : "instanceAdmin:down")}
          </span>
          {dep.latency_ms != null && dep.latency_ms > 0 ? (
            <span className="text-[12px] text-[var(--track-text-muted)]">{dep.latency_ms}ms</span>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
