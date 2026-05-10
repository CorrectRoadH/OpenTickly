import { SurfaceCard } from "@opentickly/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { DashboardAllActivities } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useWorkspaceAllActivitiesQuery,
  useWorkspaceMembersQuery,
  useWorkspaceMostActiveQuery,
} from "../../shared/query/web-shell.ts";

function formatDurationHours(seconds: number): string {
  const h = (seconds / 3600).toFixed(1);
  return `${h}h`;
}

function formatActivityDuration(seconds: number | undefined, t: (key: string) => string): string {
  if (seconds == null || seconds < 0) return t("running");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatActivityTimestamp(isoStop: string | undefined, t: (key: string) => string): string {
  if (!isoStop) return t("inProgress");
  try {
    const d = new Date(isoStop);
    return d.toLocaleString("en-US", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStop;
  }
}

function describeAction(entry: DashboardAllActivities, t: (key: string) => string): string {
  const desc = entry.description?.trim();
  if (desc) return `${t("tracked")} ${desc}`;
  return t("trackedTimeNoDescription");
}

type SettingsActivityProps = {
  workspaceId: number;
};

export function SettingsActivity({ workspaceId }: SettingsActivityProps): ReactElement {
  const { t } = useTranslation("settings");
  const activitiesQuery = useWorkspaceAllActivitiesQuery(workspaceId);
  const membersQuery = useWorkspaceMembersQuery(workspaceId);
  const mostActiveQuery = useWorkspaceMostActiveQuery(workspaceId);

  const stats = (() => {
    const entries = activitiesQuery.data ?? [];
    const totalEntries = entries.length;
    const totalSeconds = entries.reduce((sum, e) => {
      const dur = e.duration ?? 0;
      return sum + (dur >= 0 ? dur : 0);
    }, 0);
    const memberCount = membersQuery.data?.members?.length ?? 0;
    const uniqueProjects = new Set(entries.map((e) => e.project_id).filter(Boolean)).size;

    return {
      memberCount,
      totalEntries,
      totalHours: formatDurationHours(totalSeconds),
      uniqueProjects,
    };
  })();

  const topMembers = (() => {
    const data = mostActiveQuery.data ?? [];
    return data
      .filter((m) => (m.duration ?? 0) > 0)
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
      .slice(0, 10);
  })();

  const memberNameById = (() => {
    const lookup = new Map<number, string>();
    for (const m of membersQuery.data?.members ?? []) {
      const memberUserId = m.user_id ?? m.id;
      if (memberUserId && m.name) lookup.set(memberUserId, m.name);
    }
    return lookup;
  })();

  const activityRows = (() => {
    return (activitiesQuery.data ?? []).map((a) => {
      const userId = a.user_id ?? 0;
      return {
        action: describeAction(a, t),
        date: formatActivityTimestamp(a.stop, t),
        duration: formatActivityDuration(a.duration, t),
        userName: memberNameById.get(userId) ?? `User ${userId}`,
      };
    });
  })();

  const isLoading =
    activitiesQuery.isPending || membersQuery.isPending || mostActiveQuery.isPending;
  const isError = activitiesQuery.isError && membersQuery.isError && mostActiveQuery.isError;

  return (
    <SurfaceCard>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-white">{t("workspaceActivity")}</h2>
          <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
            {t("overviewOfRecentWorkspaceUsage")}
          </p>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-[12px] text-[var(--track-text-muted)]">
            {t("loadingActivityData")}
          </p>
        ) : isError ? (
          <p className="py-8 text-center text-[12px] text-[var(--track-text-muted)]">
            {t("couldNotLoadActivityData")}
          </p>
        ) : (
          <>
            <div
              className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
              data-testid="activity-stats"
            >
              <StatCard label={t("recentEntries")} value={String(stats.totalEntries)} />
              <StatCard label={t("totalHours")} value={stats.totalHours} />
              <StatCard label={t("members")} value={String(stats.memberCount)} />
              <StatCard label={t("activeProjects")} value={String(stats.uniqueProjects)} />
            </div>

            {topMembers.length > 0 ? (
              <div>
                <h3 className="mb-3 text-[14px] font-medium text-[var(--track-text-soft)]">
                  {t("mostActiveMembers")}
                </h3>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left text-[12px]"
                    data-testid="activity-top-members"
                  >
                    <thead>
                      <tr className="border-b border-[var(--track-border)] text-[var(--track-text-soft)]">
                        <th className="pb-2 pr-4 font-medium">{t("members")}</th>
                        <th className="pb-2 font-medium">{t("duration")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMembers.map((m) => (
                        <tr
                          className="border-b border-[var(--track-border)] last:border-b-0"
                          key={m.user_id}
                        >
                          <td className="py-2 pr-4 text-white">
                            {m.fullname || m.email || `User ${m.user_id}`}
                          </td>
                          <td className="py-2 text-[var(--track-text-muted)]">
                            {formatDurationHours(m.duration ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-[12px] text-[var(--track-text-muted)]">
                {t("noMemberActivityDataAvailableYet")}
              </p>
            )}

            {activityRows.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-3 text-[14px] font-medium text-[var(--track-text-soft)]">
                  {t("recentActivity")}
                </h3>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left text-[12px]"
                    data-testid="activity-detail-table"
                  >
                    <thead>
                      <tr className="border-b border-[var(--track-border)] text-[var(--track-text-soft)]">
                        <th className="pb-2 pr-4 font-medium">{t("date")}</th>
                        <th className="pb-2 pr-4 font-medium">{t("user")}</th>
                        <th className="pb-2 pr-4 font-medium">{t("action")}</th>
                        <th className="pb-2 font-medium">{t("duration")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityRows.map((row, idx) => (
                        <tr
                          className="border-b border-[var(--track-border)] last:border-b-0"
                          key={idx}
                        >
                          <td className="py-2 pr-4 text-[var(--track-text-muted)]">{row.date}</td>
                          <td className="py-2 pr-4 text-[var(--track-text-soft)]">
                            {row.userName}
                          </td>
                          <td className="py-2 pr-4 text-white">{row.action}</td>
                          <td className="py-2 text-[var(--track-text-muted)]">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SurfaceCard>
  );
}

function StatCard(props: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-4">
      <p className="text-[20px] font-semibold text-white">{props.value}</p>
      <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">{props.label}</p>
    </div>
  );
}
