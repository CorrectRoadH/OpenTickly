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
  const organizationName = session.currentOrganization?.name ?? "No organization";
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

  return (
    <div
      className="relative overflow-hidden bg-[#161616] px-3 py-4 text-white md:px-4 lg:px-5"
      data-testid="workspace-overview-page"
    >
      <OverviewBackdrop />

      <div className="relative z-10 w-full space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-[24px] font-semibold leading-[32px] text-white">Admin Overview</h1>
            <p className="text-[12px] leading-[16px] text-[#a4a4a4]">
              Set up your organization and keep your team on track
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 text-[10px] uppercase tracking-[0.04em] text-[#bfbfbf] lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="normal-case tracking-normal text-[#d6d6d6]">Set as default view</span>
              <div className="flex h-[14px] w-[28px] items-center rounded-full bg-[#2b2b2b] px-[2px]">
                <div className="size-[10px] rounded-full bg-white" />
              </div>
              <span className="text-[#e57bd9]">Refresh charts</span>
              <span className="text-[#7f7f7f]">0</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-[14px] w-[28px] rounded-[4px] bg-[#0b0b0b] shadow-[inset_0_0_0_1px_#2b2b2b]" />
              <span className="text-[#c88ec0]">View all plans</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <OverviewSurface className="px-3 py-3">
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[40px] font-semibold leading-none text-white">{memberCount}</p>
                <div className="flex items-center">
                  {teamActivity.activeMembers.slice(0, 5).map((member, index) => (
                    <span
                      className="inline-flex size-[16px] items-center justify-center rounded-full border border-[#1c1c1c] text-[8px] font-semibold text-black"
                      key={`${member.user_id ?? index}`}
                      style={{
                        backgroundColor: memberTint(index),
                        marginLeft: index === 0 ? 0 : "-4px",
                      }}
                    >
                      {initialsForMember(member)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-medium leading-[20px] text-white">
                  Members in your organization
                </p>
                <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                  {organizationName} currently has {memberCount} members in the active workspace
                  context.
                </p>
              </div>
              <div className="mt-auto space-y-2">
                <button
                  className="inline-flex h-7 items-center rounded-[6px] bg-[#e28dd6] px-4 text-[11px] font-medium text-[#1b1b1b]"
                  type="button"
                >
                  Add teammates
                </button>
                <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                  Bringing on a large team?{" "}
                  <span className="text-[#e4bddf] underline decoration-[#e4bddf]/40 underline-offset-2">
                    book a demo
                  </span>
                </p>
              </div>
            </div>
          </OverviewSurface>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <OverviewSurface className="px-3 py-3 xl:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold leading-[24px] text-white md:text-[18px]">
                  This week summary
                </h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View reports
                </span>
              </div>
              <div className="border-t border-[#343434] pt-5">
                <div className="overflow-x-auto">
                  <div className="grid min-w-[760px] grid-cols-[58px_minmax(0,1fr)] gap-4">
                    <div className="relative h-[360px] md:h-[420px]">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {weekSummary.axisLabels.map((axis) => (
                          <span
                            className="pr-2 text-[18px] leading-none font-medium text-[#8f8f8f]"
                            key={axis}
                          >
                            {axis}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="relative h-[360px] md:h-[420px]">
                        <div className="absolute inset-0 flex flex-col justify-between">
                          {weekSummary.axisLabels.map((axis) => (
                            <div
                              className="border-b border-dashed border-[#393939]"
                              key={`${axis}-line`}
                            />
                          ))}
                        </div>

                        <div className="absolute inset-0 grid grid-cols-7 gap-7 px-1">
                          {weekSummary.days.map((day) => (
                            <div className="relative flex h-full items-end justify-center" key={day.label}>
                              <div className="relative h-full w-[86px] max-w-full">
                                {day.totalSeconds > 0 ? (
                                  <>
                                    <span className="absolute bottom-[calc(var(--bar-height)+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap text-[14px] font-medium leading-none text-[#8f8f8f] [--bar-height:0px]" />
                                    <div
                                      className="absolute bottom-0 left-1/2 w-[86px] max-w-full -translate-x-1/2 rounded-t-[6px] bg-[#a156af]"
                                      style={{ height: `${day.heightPercent}%` }}
                                    >
                                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[14px] font-medium text-[#8f8f8f]">
                                        {formatClockDuration(day.totalSeconds)}
                                      </span>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-7 border-t border-[#454545] px-1 pt-2">
                        {weekSummary.days.map((day) => (
                          <span
                            className="text-center text-[15px] font-medium leading-[20px] text-[#d5d5d5]"
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

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-[#d5d5d5]">
                <span className="inline-block h-[8px] w-[25px] rounded-full bg-[#a156af]" />
                <span>Non-billable</span>
              </div>
            </div>
          </OverviewSurface>

          <OverviewSurface className="px-3 py-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">
                  Top projects this week
                </h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View reports
                </span>
              </div>
              {topProjects.length > 0 ? (
                <div className="space-y-2">
                  {topProjects.map((project) => (
                    <div className="flex items-center gap-2 text-[11px]" key={project.name}>
                      <span
                        className="size-[5px] shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[#f0f0f0]">{project.name}</span>
                      <span className="text-[#d5d5d5]">
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
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <OverviewSurface className="px-3 py-3 xl:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">Team activity</h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View team activity
                </span>
              </div>
              <div className="grid gap-6 border-t border-[#2a2a2a] pt-4 md:grid-cols-[104px_minmax(0,1fr)]">
                <StatRing
                  accent="#d67ad0"
                  subtitle={`${teamActivity.activeCount} out of ${memberCount} member${memberCount === 1 ? "" : "s"} tracking`}
                  title={`${teamActivity.coveragePercent}%`}
                />
                <div className="space-y-5">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[9px] uppercase tracking-[0.04em] text-[#a4a4a4]">
                        Tracking
                      </p>
                      {teamActivity.activeMembers.length > 0 ? (
                        <div className="space-y-2">
                          {teamActivity.activeMembers.map((member, index) => (
                            <div className="flex items-center gap-2" key={`${member.user_id ?? index}`}>
                              <span
                                className="inline-flex size-[18px] items-center justify-center rounded-full text-[9px] font-semibold text-white"
                                style={{ backgroundColor: memberTint(index + 2) }}
                              >
                                {initialsForMember(member)}
                              </span>
                              <div className="min-w-0 text-[11px] leading-[16px]">
                                <p className="truncate text-white">{memberLabel(member)}</p>
                                <p className="text-[#a4a4a4]">
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
                      <p className="text-[9px] uppercase tracking-[0.04em] text-[#a4a4a4]">
                        Not tracking
                      </p>
                      <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                        {Math.max(memberCount - teamActivity.activeCount, 0)} members have no
                        tracked time this week.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                      Bring your team to see the full picture
                    </p>
                    <button
                      className="inline-flex h-7 items-center bg-transparent px-0 text-[10px] font-semibold uppercase tracking-[0.04em] text-white"
                      type="button"
                    >
                      Invite teammates
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </OverviewSurface>

          <div className="space-y-3">
            <OverviewSurface className="px-3 py-3">
              <div className="space-y-4">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">
                  Time tracked to projects
                </h2>
                <div className="border-t border-[#2a2a2a] pt-4">
                  <StatRing
                    accent="#f0c05d"
                    subtitle={projectCoverage.subtitle}
                    title={`${projectCoverage.percent}%`}
                  />
                </div>
                <button
                  className="inline-flex h-7 items-center px-0 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#c88ec0]"
                  type="button"
                >
                  Add member to project
                </button>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-3 py-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-medium leading-[20px] text-white">FAQ</h2>
                  <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                    View more ↗
                  </span>
                </div>
                <p className="border-b border-[#2a2a2a] pb-2 text-[11px] leading-[16px] text-[#a4a4a4]">
                  The stuff most admins ask us
                </p>
                <div className="space-y-1 text-[11px] leading-[16px] text-[#d0d0d0]">
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

        <div className="pt-5 text-center text-[10px] text-[#a4a4a4]">
          <span>How could this be more useful for you? </span>
          <span className="text-[#d7a2d1] underline decoration-[#d7a2d1]/40 underline-offset-2">
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
  return <section className={`rounded-[6px] border border-[#313131] bg-[#1d1d1d] ${className}`}>{children}</section>;
}

function StatRing({
  accent,
  subtitle,
  title,
}: {
  accent: string;
  subtitle: string;
  title: string;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="grid size-[72px] place-items-center rounded-full"
        style={{ background: `conic-gradient(${accent} 0deg 360deg, transparent 360deg)` }}
      >
        <div className="grid size-[52px] place-items-center rounded-full bg-[#1d1d1d] text-[18px] font-semibold text-white">
          {title}
        </div>
      </div>
      <p className="text-[10px] leading-[16px] text-[#a4a4a4]">{subtitle}</p>
    </div>
  );
}

function OverviewEmptyState({ message }: { message: string }): ReactElement {
  return <p className="text-[11px] leading-[16px] text-[#a4a4a4]">{message}</p>;
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
  const axisMaxSeconds = Math.ceil(maxSeconds / 1800) * 1800;

  return {
    axisLabels: Array.from({ length: 6 }, (_, index) =>
      formatAxisLabel(axisMaxSeconds - Math.floor((axisMaxSeconds / 5) * index)),
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

  return [...grouped.values()].sort((left, right) => right.totalSeconds - left.totalSeconds).slice(0, 5);
}

function buildTeamActivity(members: ModelsMostActiveUser[], memberCount: number) {
  const activeCount = members.length;
  return {
    activeCount,
    activeMembers: members.slice(0, 5),
    coveragePercent: Math.max(0, Math.min(100, Math.round((activeCount / Math.max(memberCount, 1)) * 100))),
  };
}

function buildProjectCoverage(activities: DashboardAllActivities[]) {
  const totalSeconds = activities.reduce((sum, activity) => sum + resolveDashboardDuration(activity), 0);
  const assignedSeconds = activities.reduce(
    (sum, activity) =>
      sum + ((activity.project_id ?? 0) > 0 ? resolveDashboardDuration(activity) : 0),
    0,
  );

  return {
    percent: totalSeconds > 0 ? Math.round((assignedSeconds / totalSeconds) * 100) : 0,
    subtitle: totalSeconds > 0 ? `${formatHours(assignedSeconds)} tracked this week` : "No tracked project time yet",
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
  return Boolean(value) && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key]);
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
  const label = memberLabel(member).replace(/[^A-Za-z0-9\u4e00-\u9fa5 ]/g, "").trim();
  return label ? label.slice(0, 1).toUpperCase() : "•";
}
