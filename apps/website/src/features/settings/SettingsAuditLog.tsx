import { ShellSurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useMemo } from "react";

import { useWorkspaceAllActivitiesQuery } from "../../shared/query/web-shell.ts";
import type { DashboardAllActivities } from "../../shared/api/generated/public-track/types.gen.ts";

function formatActivityTimestamp(isoStop: string | undefined): string {
  if (!isoStop) return "In progress";
  try {
    const d = new Date(isoStop);
    return d.toLocaleString(undefined, {
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

function formatActivityDuration(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return "Running";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function describeAction(entry: DashboardAllActivities): string {
  const desc = entry.description?.trim();
  if (desc) return `Tracked: ${desc}`;
  return "Tracked time (no description)";
}

type AuditLogRow = {
  action: string;
  date: string;
  duration: string;
  userId: number;
};

function mapToRows(activities: DashboardAllActivities[]): AuditLogRow[] {
  return activities.map((a) => ({
    action: describeAction(a),
    date: formatActivityTimestamp(a.stop),
    duration: formatActivityDuration(a.duration),
    userId: a.user_id ?? 0,
  }));
}

type SettingsAuditLogProps = {
  workspaceId: number;
};

export function SettingsAuditLog({ workspaceId }: SettingsAuditLogProps): ReactElement {
  const activitiesQuery = useWorkspaceAllActivitiesQuery(workspaceId);

  const rows = useMemo(() => mapToRows(activitiesQuery.data ?? []), [activitiesQuery.data]);

  return (
    <ShellSurfaceCard>
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-[16px] font-semibold text-white">Audit Log</h2>
          <p className="mt-1 text-[13px] text-[var(--track-text-muted)]">
            Recent workspace activity from all members.
          </p>
        </div>

        {activitiesQuery.isPending ? (
          <p className="py-8 text-center text-[13px] text-[var(--track-text-muted)]">
            Loading audit log...
          </p>
        ) : activitiesQuery.isError ? (
          <p className="py-8 text-center text-[13px] text-[var(--track-text-muted)]">
            Could not load audit log data. Try again later.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--track-text-muted)]">
            No recent activity found in this workspace.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]" data-testid="audit-log-table">
              <thead>
                <tr className="border-b border-[var(--track-border)] text-[var(--track-text-soft)]">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Action</th>
                  <th className="pb-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr className="border-b border-[var(--track-border)] last:border-b-0" key={idx}>
                    <td className="py-2 pr-4 text-[var(--track-text-muted)]">{row.date}</td>
                    <td className="py-2 pr-4 text-[var(--track-text-soft)]">User {row.userId}</td>
                    <td className="py-2 pr-4 text-white">{row.action}</td>
                    <td className="py-2 text-[var(--track-text-muted)]">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ShellSurfaceCard>
  );
}
