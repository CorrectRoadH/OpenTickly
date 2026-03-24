import { type ReactElement, type ReactNode, useMemo } from "react";

import {
  formatClockDuration,
  formatDateKey,
  formatHours,
  getCurrentWeekDays,
} from "../../features/tracking/overview-data.ts";
import type {
  DashboardAllActivities,
  GithubComTogglTogglApiInternalModelsProject,
  ModelsMostActiveUser,
} from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useProjectsQuery,
  useWorkspaceAllActivitiesQuery,
  useWorkspaceMostActiveQuery,
  useWorkspaceTopActivityQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceOverviewPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const memberCount = session.currentOrganization?.userCount ?? 1;
  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const timezone = session.user.timezone ?? "UTC";
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const allActivitiesQuery = useWorkspaceAllActivitiesQuery(workspaceId);
  const topActivityQuery = useWorkspaceTopActivityQuery(workspaceId);
  const mostActiveQuery = useWorkspaceMostActiveQuery(workspaceId);
  const projects = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
  const weekSummary = useMemo(
    () => buildWeekSummary(allActivitiesQuery.data ?? [], weekDays, timezone),
    [allActivitiesQuery.data, timezone, weekDays],
  );
  const topProjects = useMemo(
    () => buildTopProjects(topActivityQuery.data ?? [], projects),
    [projects, topActivityQuery.data],
  );
  const teamActivity = useMemo(
    () => buildTeamActivity(mostActiveQuery.data ?? [], memberCount),
    [memberCount, mostActiveQuery.data],
  );
  const projectCoverage = useMemo(
    () => buildProjectCoverage(topActivityQuery.data ?? []),
    [topActivityQuery.data],
  );
  const overviewProgressPercent = useMemo(
    () =>
      [
        memberCount > 1,
        teamActivity.activeCount > 0,
        topProjects.length > 0,
        projectCoverage.percent > 0,
      ].filter(Boolean).length * 25,
    [memberCount, projectCoverage.percent, teamActivity.activeCount, topProjects.length],
  );

  return (
    <div
      className="relative overflow-hidden bg-[var(--track-surface)] px-5 py-5 text-[var(--track-text)]"
      data-testid="workspace-overview-page"
    >
      <OverviewBackdrop />

      <div
        className="relative z-10 flex w-full flex-col gap-5"
        data-testid="workspace-overview-content"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-[21px] font-semibold leading-[30px] text-white">Admin Overview</h1>
            <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
              Set up your organization and keep your team on track
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)] lg:items-end">
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              <span className="normal-case font-medium tracking-normal text-white">
                Set as default view
              </span>
              <div className="flex h-[18px] w-[32px] items-center rounded-full bg-[var(--track-border)] px-[2px]">
                <div className="size-[14px] rounded-full bg-white" />
              </div>
              <span className="text-[var(--track-accent)]">Refresh charts</span>
              <span className="text-[var(--track-text-soft)]">0</span>
            </div>
            <div className="flex min-h-9 items-center gap-3">
              <div className="h-[18px] w-[80px] rounded-[8px] bg-[var(--track-panel)] shadow-[inset_0_0_0_1px_var(--track-border)]" />
              <span className="text-[var(--track-accent)]">View all plans</span>
            </div>
          </div>
        </div>

        <div
          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"
          data-testid="workspace-overview-grid"
        >
          <div className="flex flex-col gap-5">
            <OverviewSurface className="bg-[var(--track-accent-soft)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-5 text-white">
                    Unlock your admin overview
                  </p>
                  <p className="text-[12px] leading-4 text-[var(--track-accent-text)]">
                    Finish the steps below to see project and team activity.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] font-semibold leading-none text-white">
                    {overviewProgressPercent}%
                  </span>
                  <div className="h-1 w-[72px] rounded-full bg-[#684863]">
                    <div
                      className="h-1 rounded-full bg-[var(--track-accent)]"
                      style={{ width: `${overviewProgressPercent}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-[var(--track-accent-text)]">⌄</span>
                </div>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-5 py-4 lg:min-h-[240px]">
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                    This week summary
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]">
                    View reports
                  </span>
                </div>
                <div className="flex-1 border-t border-[var(--track-border)] pt-4">
                  <div className="overflow-x-auto">
                    <div className="grid min-w-[394px] grid-cols-[30px_minmax(0,1fr)] gap-2">
                      <div className="relative h-[132px]">
                        <div className="absolute inset-0 flex flex-col justify-between">
                          {weekSummary.axisLabels.map((axis) => (
                            <span
                              className="pr-1 text-[11px] leading-none text-[var(--track-text-soft)]"
                              key={axis}
                            >
                              {axis}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative h-[132px]">
                          <div className="absolute inset-0 flex flex-col justify-between">
                            {weekSummary.axisLabels.map((axis) => (
                              <div
                                className="border-b border-dashed border-[var(--track-border)]"
                                key={`${axis}-line`}
                              />
                            ))}
                          </div>

                          <div className="absolute inset-0 grid grid-cols-7 gap-[6px] px-[2px]">
                            {weekSummary.days.map((day) => (
                              <div
                                className="relative flex h-full items-end justify-center"
                                key={day.label}
                              >
                                <div className="relative h-full w-[26px] max-w-full">
                                  {day.totalSeconds > 0 ? (
                                    <div
                                      className="absolute bottom-0 left-1/2 w-[24px] max-w-full -translate-x-1/2 rounded-t-[3px] bg-[var(--track-accent)]"
                                      style={{ height: `${day.heightPercent}%` }}
                                    >
                                      <span className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-[var(--track-text-soft)]">
                                        {formatClockDuration(day.totalSeconds)}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-[6px] border-t border-[var(--track-border)] px-[2px] pt-1.5">
                          {weekSummary.days.map((day) => (
                            <span
                              className="text-center text-[11px] font-medium leading-4 text-[var(--track-text-muted)]"
                              key={`${day.label}-tick`}
                            >
                              {day.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[11px] text-[var(--track-text-muted)]">
                  <span className="inline-block h-[4px] w-[18px] rounded-full bg-[var(--track-accent)]" />
                  <span>Non-billable</span>
                </div>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-5 py-4 lg:min-h-[196px]">
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                    Team activity
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]">
                    View team activity
                  </span>
                </div>
                <div className="flex-1 border-t border-[var(--track-border)] pt-4">
                  <div className="grid gap-4 lg:grid-cols-[108px_minmax(0,1fr)_104px]">
                    <StatRing
                      accent="#d67ad0"
                      percent={teamActivity.coveragePercent}
                      size={74}
                      innerSize={50}
                      subtitle={`${teamActivity.activeCount} out of ${memberCount} member${memberCount === 1 ? "" : "s"} tracking`}
                      title={`${teamActivity.coveragePercent}%`}
                    />
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                        Tracking
                      </p>
                      {teamActivity.activeMembers.length > 0 ? (
                        <div className="space-y-2">
                          {teamActivity.activeMembers.slice(0, 2).map((member, index) => (
                            <div
                              className="flex items-center gap-2"
                              key={`${member.user_id ?? index}`}
                            >
                              <span
                                className="inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--track-surface)]"
                                style={{ backgroundColor: memberTint(index + 2) }}
                              >
                                {initialsForMember(member)}
                              </span>
                              <div className="min-w-0 text-[14px] leading-5">
                                <p className="truncate text-white">{memberLabel(member)}</p>
                                <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                                  {formatClockDuration(member.duration ?? 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <OverviewEmptyState message="No active members yet." />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                        Not tracking
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 pt-4">
                    <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
                      Bring your team to see the full picture
                    </p>
                    <button
                      className="inline-flex h-6 items-center bg-transparent px-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]"
                      type="button"
                    >
                      Invite teammates
                    </button>
                  </div>
                </div>
              </div>
            </OverviewSurface>
          </div>

          <div className="flex flex-col gap-5">
            <OverviewSurface className="px-5 py-4 lg:min-h-[168px]">
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-white">
                    {memberCount}
                  </p>
                  <MemberAvatarCluster members={teamActivity.activeMembers} />
                </div>
                <div className="space-y-1">
                  <p className="text-[16px] font-semibold leading-[23px] text-white">
                    Members in your organization
                  </p>
                  <p className="max-w-[240px] text-[14px] leading-5 text-[var(--track-text-muted)]">
                    Your insights are incomplete if you&apos;re tracking alone. Invite your team to
                    see the full picture
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <button
                    className="inline-flex h-9 items-center rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
                    type="button"
                  >
                    Add teammates
                  </button>
                  <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                    Bringing on a large team?{" "}
                    <span className="text-[var(--track-accent-text)] underline decoration-[var(--track-accent-text)]/40 underline-offset-2">
                      book a demo
                    </span>
                  </p>
                </div>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-5 py-4 lg:min-h-[156px]">
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                    Top projects this week
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]">
                    View reports
                  </span>
                </div>
                {topProjects.length > 0 ? (
                  <div className="space-y-2 border-t border-[var(--track-border)] pt-3">
                    {topProjects.map((project) => (
                      <div className="flex items-center gap-2 text-[14px]" key={project.name}>
                        <span
                          className="size-[5px] shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-white">{project.name}</span>
                        <span className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                          {formatClockDuration(project.totalSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <OverviewEmptyState message="No tracked projects in this workspace yet." />
                )}
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-5 py-4 lg:min-h-[170px]">
              <div className="flex h-full flex-col gap-4">
                <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                  Time tracked to projects
                </h2>
                <div className="flex-1 border-t border-[var(--track-border)] pt-3">
                  <StatRing
                    accent="#f0c05d"
                    percent={projectCoverage.percent}
                    size={84}
                    innerSize={58}
                    subtitle={
                      projectCoverage.percent > 0 ? "Keep it this way" : projectCoverage.subtitle
                    }
                    title={`${projectCoverage.percent}%`}
                  />
                </div>
                <button
                  className="inline-flex h-6 items-center px-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]"
                  type="button"
                >
                  Add member to project
                </button>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-5 py-4 lg:min-h-[150px]">
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[16px] font-semibold leading-[23px] text-white">FAQ</h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-accent)]">
                    View more ↗
                  </span>
                </div>
                <p className="border-b border-[var(--track-border)] pb-2 text-[14px] leading-5 text-[var(--track-text-muted)]">
                  The stuff most admins ask us
                </p>
                <div className="space-y-1 text-[14px] leading-5 text-[var(--track-text)]">
                  <p>How should I set up my workspace?</p>
                  <p>How do roles and permissions work?</p>
                  <p>How do I set billable rates?</p>
                  <p>How can I ensure accurate time tracking?</p>
                  <p>How do I create and use reports?</p>
                </div>
              </div>
            </OverviewSurface>
          </div>
        </div>

        <div className="pt-5 text-center text-[12px] text-[var(--track-text-soft)]">
          <span>How could this be more useful for you? </span>
          <span className="text-[var(--track-accent-text)] underline decoration-[var(--track-accent-text)]/40 underline-offset-2">
            Let us know.
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <section
      className={`h-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] ${className}`}
    >
      {children}
    </section>
  );
}

function MemberAvatarCluster({ members }: { members: ModelsMostActiveUser[] }): ReactElement {
  const visibleMembers = members.slice(0, 5);

  return (
    <div className="relative h-[32px] w-[66px] shrink-0">
      {visibleMembers.map((member, index) => {
        const positions = [
          { left: 40, top: 0, size: 12 },
          { left: 18, top: 4, size: 12 },
          { left: 52, top: 10, size: 12 },
          { left: 28, top: 12, size: 22 },
          { left: 4, top: 14, size: 12 },
        ];
        const position = positions[index] ?? positions[positions.length - 1];

        return (
          <span
            className="absolute inline-flex items-center justify-center rounded-full border border-[var(--track-surface)] font-semibold text-[var(--track-surface)]"
            key={`${member.user_id ?? index}`}
            style={{
              backgroundColor: memberTint(index),
              fontSize: position.size <= 12 ? 7 : 9,
              height: position.size,
              left: position.left,
              top: position.top,
              width: position.size,
            }}
          >
            {initialsForMember(member)}
          </span>
        );
      })}
    </div>
  );
}

function StatRing({
  accent,
  percent,
  innerSize,
  size,
  subtitle,
  title,
}: {
  accent: string;
  percent: number;
  innerSize: number;
  size: number;
  subtitle: string;
  title: string;
}): ReactElement {
  const sweep = Math.max(0, Math.min(100, percent)) * 3.6;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="grid place-items-center rounded-full"
        style={{
          background: `conic-gradient(${accent} 0deg ${sweep}deg, #3a3a3a ${sweep}deg 360deg)`,
          height: size,
          width: size,
        }}
      >
        <div
          className="grid place-items-center rounded-full bg-[var(--track-surface)] text-[16px] font-semibold text-white"
          style={{ height: innerSize, width: innerSize }}
        >
          {title}
        </div>
      </div>
      <p className="text-center text-[11px] leading-4 text-[var(--track-text-muted)]">{subtitle}</p>
    </div>
  );
}

function OverviewEmptyState({ message }: { message: string }): ReactElement {
  return <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">{message}</p>;
}

function OverviewBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-120px] top-[520px] size-[280px] rounded-full border-[38px] border-[#202020] opacity-90" />
      <div
        className="absolute bottom-[-110px] left-[-40px] h-[240px] w-[360px] rounded-[48px] bg-[#1b1b1b] opacity-70"
        style={{ clipPath: "polygon(0 20%, 78% 0, 100% 100%, 18% 100%)" }}
      />
      <div
        className="absolute right-[72px] top-[140px] h-[190px] w-[220px] bg-[#1b1b1b] opacity-75"
        style={{ clipPath: "polygon(34% 0, 100% 22%, 78% 100%, 0 72%)" }}
      />
      <div className="absolute right-[-70px] top-[255px] size-[130px] rounded-full border-[22px] border-[#222222] opacity-85" />
      <div
        className="absolute bottom-[46px] right-[185px] h-[280px] w-[220px] bg-[#1d1d1d] opacity-75"
        style={{ clipPath: "polygon(35% 0, 100% 16%, 88% 100%, 0 80%)" }}
      />
      <div
        className="absolute right-[235px] top-[32px] h-[74px] w-[70px] bg-[#1e1e1e] opacity-80"
        style={{ clipPath: "polygon(52% 0, 100% 52%, 38% 100%, 0 38%)" }}
      />
    </div>
  );
}

function buildWeekSummary(
  activities: DashboardAllActivities[],
  weekDays: Date[],
  timezone: string,
) {
  const totalsByDay = new Map<string, number>();

  for (const activity of activities) {
    const dateKey = activity.stop ? formatDateKey(new Date(activity.stop), timezone) : null;
    if (!dateKey) {
      continue;
    }
    totalsByDay.set(dateKey, (totalsByDay.get(dateKey) ?? 0) + resolveDashboardDuration(activity));
  }

  const maxSeconds = Math.max(
    ...weekDays.map((day) => totalsByDay.get(formatDateKey(day, timezone)) ?? 0),
    1800,
  );
  const axisStepSeconds = Math.max(1800, Math.ceil(maxSeconds / 5 / 1800) * 1800);
  const axisMaxSeconds = axisStepSeconds * 5;

  return {
    axisLabels: Array.from({ length: 6 }, (_, index) =>
      formatAxisLabel(axisMaxSeconds - axisStepSeconds * index),
    ),
    days: weekDays.map((day) => {
      const totalSeconds = totalsByDay.get(formatDateKey(day, timezone)) ?? 0;
      return {
        heightPercent: Math.max(0, Math.min(100, (totalSeconds / axisMaxSeconds) * 100)),
        label: formatShortAxisDay(day),
        totalSeconds,
      };
    }),
  };
}

function buildTopProjects(
  activities: DashboardAllActivities[],
  projects: GithubComTogglTogglApiInternalModelsProject[],
) {
  const projectById = new Map(
    projects.map((project) => [
      project.id ?? -1,
      {
        color: project.color?.trim() || "#cf58c4",
        name: project.name?.trim() || "(No project)",
      },
    ]),
  );
  const grouped = new Map<number, { color: string; name: string; totalSeconds: number }>();

  for (const activity of activities) {
    const projectId = activity.project_id ?? 0;
    const project = projectById.get(projectId) ?? {
      color: "#cf58c4",
      name: projectId === 0 ? "(No project)" : `Project #${projectId}`,
    };
    const current = grouped.get(projectId) ?? { ...project, totalSeconds: 0 };
    current.totalSeconds += resolveDashboardDuration(activity);
    grouped.set(projectId, current);
  }

  return [...grouped.values()]
    .sort((left, right) => right.totalSeconds - left.totalSeconds)
    .slice(0, 5);
}

function buildTeamActivity(members: ModelsMostActiveUser[], memberCount: number) {
  const activeCount = members.length;
  return {
    activeCount,
    activeMembers: members.slice(0, 5),
    coveragePercent: Math.max(
      0,
      Math.min(100, Math.round((activeCount / Math.max(memberCount, 1)) * 100)),
    ),
  };
}

function buildProjectCoverage(activities: DashboardAllActivities[]) {
  const totalSeconds = activities.reduce(
    (sum, activity) => sum + resolveDashboardDuration(activity),
    0,
  );
  const assignedSeconds = activities.reduce(
    (sum, activity) =>
      sum + ((activity.project_id ?? 0) > 0 ? resolveDashboardDuration(activity) : 0),
    0,
  );

  return {
    percent: totalSeconds > 0 ? Math.round((assignedSeconds / totalSeconds) * 100) : 0,
    subtitle:
      totalSeconds > 0
        ? `${formatHours(assignedSeconds)} tracked this week`
        : "No tracked project time yet",
  };
}

function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data as GithubComTogglTogglApiInternalModelsProject[];
  }
  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }
  if (hasProjectArray(data, "data")) {
    return data.data;
  }
  return [];
}

function hasProjectArray(
  value: unknown,
  key: "data" | "projects",
): value is Record<typeof key, GithubComTogglTogglApiInternalModelsProject[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

function resolveDashboardDuration(activity: DashboardAllActivities): number {
  const duration = activity.duration ?? 0;
  return duration >= 0 ? duration : Math.max(0, Math.floor(Date.now() / 1000) + duration);
}

function formatAxisLabel(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  if (hours === 0) {
    return "0h";
  }
  return Number.isInteger(hours) ? `${hours}h` : `${Math.floor(hours)}h 30`;
}

function formatShortAxisDay(day: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${weekday} ${month}-${date}`;
}

function memberTint(index: number): string {
  return ["#f9d7f4", "#f9e7cb", "#fff0d4", "#e57bd9", "#fbe5fb"][index % 5];
}

function memberLabel(member: ModelsMostActiveUser): string {
  return member.fullname?.trim() || member.email?.trim() || `User #${member.user_id ?? "?"}`;
}

function initialsForMember(member: ModelsMostActiveUser): string {
  const label = memberLabel(member)
    .replace(/[^A-Za-z0-9\u4e00-\u9fa5 ]/g, "")
    .trim();
  return label ? label.slice(0, 1).toUpperCase() : "•";
}
