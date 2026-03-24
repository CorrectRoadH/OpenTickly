import { type ReactElement } from "react";

import type {
  ModelsProjectStatistics,
  ModelsProjectUser,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { WorkspaceMember } from "../../shared/api/generated/web/types.gen.ts";
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import {
  useProjectDetailQuery,
  useProjectMembersQuery,
  useProjectStatisticsQuery,
  useWorkspaceMembersQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  buildProjectDashboardPath,
  buildProjectTeamPath,
  buildProjectsListPath,
} from "../../shared/url-state/projects-location.ts";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";

type ProjectDetailPageProps = {
  projectId: number;
  workspaceId: number;
};

export function ProjectDetailPage({
  projectId,
  workspaceId,
}: ProjectDetailPageProps): ReactElement {
  const session = useSession();
  const projectQuery = useProjectDetailQuery(workspaceId, projectId);
  const membersQuery = useProjectMembersQuery(workspaceId, projectId);
  const statisticsQuery = useProjectStatisticsQuery(workspaceId, projectId);
  const workspaceMembersQuery = useWorkspaceMembersQuery(workspaceId);
  const project = projectQuery.data;
  const members = normalizeProjectMembers(membersQuery.data);
  const workspaceMembers = workspaceMembersQuery.data?.members ?? [];
  const totalSeconds = project?.actual_seconds ?? 0;
  const billableSeconds = project?.billable ? totalSeconds : 0;

  return (
    <main className="min-h-dvh bg-[var(--track-surface)] px-5 py-4 text-white">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_210px]">
        <section className="min-w-0">
          <header className="border-b border-[var(--track-border)] pb-4">
            <div className="flex items-center gap-2 text-[12px] text-[var(--track-text-muted)]">
              <a href={buildProjectsListPath(workspaceId)}>Projects</a>
              <TrackingIcon className="size-3" name="chevron-right" />
              <span className="font-medium text-[var(--track-accent)]">
                {project?.name ?? `Project ${projectId}`}
              </span>
              <TrackingIcon className="size-3" name="focus" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <nav className="flex items-end gap-6 text-[14px]" aria-label="Project sections">
                <a
                  className="pb-3 text-[var(--track-text-muted)] hover:text-white"
                  href={buildProjectDashboardPath(workspaceId, projectId)}
                >
                  Dashboard
                </a>
                <a
                  className="pb-3 text-[var(--track-text-muted)] hover:text-white"
                  href={buildWorkspaceTasksPath({ projectId, workspaceId })}
                >
                  Tasks
                </a>
                <a
                  aria-current="page"
                  className="border-b-2 border-[var(--track-accent)] pb-3 font-medium text-white"
                  href={buildProjectTeamPath(workspaceId, projectId)}
                >
                  Team
                </a>
              </nav>
              <button
                className="rounded-md bg-[var(--track-button)] px-4 py-2 text-[12px] font-medium text-black"
                type="button"
              >
                Edit Project
              </button>
            </div>
          </header>

          {projectQuery.isPending ? (
            <ProjectDetailMessage message="Loading project team..." />
          ) : null}
          {projectQuery.isError ? (
            <ProjectDetailMessage
              message="Project detail is temporarily unavailable."
              tone="error"
            />
          ) : null}

          {project ? (
            <section className="pt-3">
              <div className="rounded-lg border border-[var(--track-border)] bg-[#1b1b1b]">
                <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-[var(--track-text-muted)]">
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#303030] text-[10px] font-semibold text-white">
                    i
                  </span>
                  <p>
                    {project.is_private
                      ? "This project is private."
                      : "Everyone in this Workspace can see this Project."}{" "}
                    <a className="text-[#d8b0ee] underline" href="#privacy">
                      {project.is_private ? "Manage access" : "You can make it private"}
                    </a>
                  </p>
                </div>

                <div className="grid grid-cols-[minmax(220px,1.7fr)_112px_112px_160px] border-t border-[var(--track-border)] px-4 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  <HeaderCell label="All members/teams" />
                  <HeaderCell label="Rate">
                    <FeatureBadge label="Starter" tone="starter" />
                  </HeaderCell>
                  <HeaderCell label="Cost">
                    <FeatureBadge
                      label={session.currentWorkspace.isPremium ? "Premium" : "Free"}
                      tone="premium"
                    />
                  </HeaderCell>
                  <HeaderCell label="Role" />
                </div>

                {membersQuery.isPending ? (
                  <ProjectDetailMessage message="Loading members..." />
                ) : (
                  <ul aria-label="Project team members">
                    {members.map((member) => {
                      const display = resolveProjectMemberDisplay(
                        member,
                        workspaceMembers,
                        session.user.fullName,
                        members.length === 1,
                      );

                      return (
                        <li
                          className="grid grid-cols-[minmax(220px,1.7fr)_112px_112px_160px] items-center border-t border-[var(--track-border)] px-4"
                          key={`${member.project_id}-${member.user_id}`}
                        >
                          <div className="flex min-h-[66px] items-center gap-3">
                            <Avatar initials={display.initials} />
                            <span className="truncate text-[14px] font-medium text-white">
                              {display.name}
                            </span>
                          </div>
                          <ValueCell value={member.rate == null ? "-" : formatMoney(member.rate)} />
                          <ValueCell
                            value={member.labor_cost == null ? "-" : formatMoney(member.labor_cost)}
                          />
                          <div className="py-4">
                            <p className="text-[14px] font-medium text-white">
                              {member.manager ? "Manager" : "Member"}
                            </p>
                            <p className="text-[12px] text-[var(--track-text-muted)]">
                              {member.manager ? "Views all entries." : "Can view assigned work."}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                    {!membersQuery.isPending && members.length === 0 ? (
                      <li className="border-t border-[var(--track-border)] px-4 py-6 text-[14px] text-[var(--track-text-muted)]">
                        No members assigned.
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="pt-6 lg:pt-14">
          <div className="space-y-5">
            <StatBlock label="Total hours" value={formatDuration(totalSeconds)} />
            <StatBlock label="Billable hours" value={formatDuration(billableSeconds)} />
            <div className="flex justify-center pt-1">
              <ProjectDonut />
            </div>
            <TimelineBlock statistics={statisticsQuery.data} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProjectDetailMessage({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}): ReactElement {
  return (
    <p
      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-rose-600/40 text-rose-300"
          : "border-[var(--track-border)] text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </p>
  );
}

function HeaderCell({ children, label }: { children?: ReactElement; label: string }): ReactElement {
  return (
    <div className="flex min-h-[36px] items-center gap-2">
      <span>{label}</span>
      {children}
    </div>
  );
}

function FeatureBadge({
  label,
  tone,
}: {
  label: string;
  tone: "premium" | "starter";
}): ReactElement {
  return (
    <span
      className={`rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase ${
        tone === "premium" ? "bg-[#69483d] text-[#ffb08d]" : "bg-[#5f406a] text-[#efb7ff]"
      }`}
    >
      {label}
    </span>
  );
}

function ValueCell({ value }: { value: string }): ReactElement {
  return <div className="py-4 text-[14px] text-[var(--track-text-muted)]">{value}</div>;
}

function StatBlock({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function TimelineBlock({
  statistics,
}: {
  statistics: ModelsProjectStatistics | undefined;
}): ReactElement | null {
  if (!statistics?.earliest_time_entry && !statistics?.latest_time_entry) {
    return null;
  }

  return (
    <div className="text-[12px] text-[var(--track-text-muted)]">
      <p>First entry: {statistics.earliest_time_entry ?? "-"}</p>
      <p className="mt-1">Last entry: {statistics.latest_time_entry ?? "-"}</p>
    </div>
  );
}

function ProjectDonut(): ReactElement {
  return (
    <div className="relative size-[106px] rounded-full bg-[conic-gradient(#a356c1_360deg,#a356c1_360deg)]">
      <div className="absolute inset-[22px] rounded-full bg-[var(--track-surface)]" />
    </div>
  );
}

function Avatar({ initials }: { initials: string }): ReactElement {
  return (
    <div className="flex size-7 items-center justify-center rounded-full bg-[#3b3b3b] text-[11px] font-semibold text-white">
      {initials}
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function normalizeProjectMembers(data: unknown): ModelsProjectUser[] {
  if (Array.isArray(data)) {
    return data as ModelsProjectUser[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { members?: unknown }).members)) {
    return (data as { members: ModelsProjectUser[] }).members;
  }

  return [];
}

function resolveProjectMemberDisplay(
  member: ModelsProjectUser,
  workspaceMembers: WorkspaceMember[],
  fallbackUserName: string,
  preferFallbackName: boolean,
): { initials: string; name: string } {
  const workspaceMember = workspaceMembers.find((entry) => entry.id === member.user_id);
  const name =
    workspaceMember?.name ||
    (preferFallbackName && fallbackUserName ? fallbackUserName : "") ||
    `User ${member.user_id ?? member.id ?? "?"}`;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return {
    initials: initials || "U",
    name,
  };
}
