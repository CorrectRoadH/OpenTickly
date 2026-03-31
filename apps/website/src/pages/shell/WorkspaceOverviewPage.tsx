import { type ReactElement, type ReactNode, useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart } from "recharts";
import { AppButton, PageLayout, SurfaceCard } from "@opentoggl/web-ui";
import { toast } from "sonner";

import {
  formatClockDuration,
  formatDateKey,
  formatHours,
  getCurrentWeekDays,
} from "../../features/tracking/overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import type {
  DashboardAllActivities,
  GithubComTogglTogglApiInternalModelsProject,
  ModelsMostActiveUser,
} from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useInviteWorkspaceMemberMutation,
  useProjectsQuery,
  useWorkspaceAllActivitiesQuery,
  useWorkspaceMembersQuery,
  useWorkspaceMostActiveQuery,
  useWorkspaceTopActivityQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { InviteMemberDialog } from "../members/InviteMemberDialog.tsx";
import { OnboardingChecklist } from "./OnboardingChecklist.tsx";
import { OverviewWeekChart } from "./OverviewWeekChart.tsx";

export function WorkspaceOverviewPage(): ReactElement {
  const { beginningOfWeek, durationFormat } = useUserPreferences();
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const memberCount = session.currentOrganization?.userCount ?? 1;
  const weekDays = useMemo(() => getCurrentWeekDays(beginningOfWeek), [beginningOfWeek]);
  const timezone = session.user.timezone ?? "UTC";
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const allActivitiesQuery = useWorkspaceAllActivitiesQuery(workspaceId);
  const topActivityQuery = useWorkspaceTopActivityQuery(workspaceId);
  const mostActiveQuery = useWorkspaceMostActiveQuery(workspaceId);
  const membersQuery = useWorkspaceMembersQuery(workspaceId);
  const memberNameById = useMemo(() => {
    const lookup = new Map<number, string>();
    const members = membersQuery.data?.members ?? [];
    for (const m of members) {
      if (m.id && m.name) lookup.set(m.id, m.name);
      if (m.id && m.email && !lookup.has(m.id)) lookup.set(m.id, m.email);
    }
    return lookup;
  }, [membersQuery.data]);
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceId);
  const handleInviteSubmit = useCallback(() => {
    inviteMutation.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${inviteEmail.trim()}`);
          setInviteDialogOpen(false);
          setInviteEmail("");
          setInviteRole("member");
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Failed to send invitation";
          if (message.includes("SMTP") || message.includes("email sending")) {
            toast.error(
              "Email sending is not configured. Configure SMTP in Instance Admin before sending invitations.",
            );
          } else {
            toast.error(message);
          }
        },
      },
    );
  }, [inviteEmail, inviteMutation, inviteRole]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const handleRefreshCharts = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("workspace-dashboard-");
      },
    });
  }, [queryClient]);
  const handleViewReports = useCallback(() => {
    void navigate({ to: `/workspaces/${workspaceId}/reports` });
  }, [navigate, workspaceId]);
  return (
    <>
      <PageLayout
        data-testid="workspace-overview-page"
        headerActions={
          <AppButton onClick={handleRefreshCharts} type="button" variant="secondary">
            Refresh data
          </AppButton>
        }
        subtitle="Set up your organization and keep your team on track"
        title="Admin Overview"
      >
        <div className="px-5 py-5" data-testid="workspace-overview-content">
          <div
            className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"
            data-testid="workspace-overview-grid"
          >
            <div className="flex flex-col gap-5">
              <OnboardingChecklist
                onInviteClick={() => setInviteDialogOpen(true)}
                workspaceId={workspaceId}
              />

              <OverviewSurface className="lg:min-h-[240px]">
                <div className="flex h-full flex-col gap-4">
                  <OverviewCardHeader
                    actionLabel="Open reports"
                    onAction={handleViewReports}
                    title="This week summary"
                  />
                  <div className="flex-1 border-t border-[var(--track-border)] pt-4">
                    <OverviewWeekChart
                      axisLabels={weekSummary.axisLabels}
                      axisMaxSeconds={weekSummary.axisMaxSeconds}
                      days={weekSummary.days}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-0.5 text-[11px] text-[var(--track-text-muted)]">
                    <LegendSwatch color="var(--track-accent)" label="Billable" />
                    <LegendSwatch color="var(--track-accent-strong)" label="Non-billable" />
                  </div>
                </div>
              </OverviewSurface>

              <OverviewSurface className="lg:min-h-[196px]">
                <div className="flex h-full flex-col gap-4">
                  <OverviewCardHeader
                    actionLabel="Team reports"
                    onAction={handleViewReports}
                    title="Team activity"
                  />
                  <div className="flex-1 border-t border-[var(--track-border)] pt-4">
                    <div className="grid gap-4 lg:grid-cols-[108px_minmax(0,1fr)_104px]">
                      <StatRing
                        accent="var(--track-accent-secondary)"
                        percent={teamActivity.coveragePercent}
                        size={74}
                        innerSize={50}
                        subtitle={`${teamActivity.activeCount} of ${memberCount} members tracking`}
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
                                  {initialsForMember(member, memberNameById)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] text-white">
                                    {memberLabel(member, memberNameById)}
                                  </p>
                                  <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                                    {formatClockDuration(member.duration ?? 0, durationFormat)}
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
                        <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                          {Math.max(memberCount - teamActivity.activeCount, 0)} members idle
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4">
                      <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                        Bring your team in to unlock better weekly coverage.
                      </p>
                      <AppButton onClick={() => setInviteDialogOpen(true)} size="sm" type="button">
                        Invite teammates
                      </AppButton>
                    </div>
                  </div>
                </div>
              </OverviewSurface>
            </div>

            <div className="flex flex-col gap-5">
              <OverviewSurface className="lg:min-h-[168px]">
                <div className="flex h-full flex-col gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                      Team size
                    </p>
                    <p className="text-[14px] font-semibold text-white">
                      {memberCount} members in your organization
                    </p>
                    <p className="max-w-[260px] text-[12px] leading-4 text-[var(--track-text-muted)]">
                      Insights improve when the whole team tracks in one workspace.
                    </p>
                  </div>
                  <AppButton onClick={() => setInviteDialogOpen(true)} type="button">
                    Add teammates
                  </AppButton>
                </div>
              </OverviewSurface>

              <OverviewSurface className="lg:min-h-[156px]">
                <div className="flex h-full flex-col gap-4">
                  <OverviewCardHeader
                    actionLabel="Open reports"
                    onAction={handleViewReports}
                    title="Top projects this week"
                  />
                  {topProjects.length > 0 ? (
                    <div className="space-y-2 border-t border-[var(--track-border)] pt-4">
                      {topProjects.map((project) => (
                        <div className="flex items-center gap-2 text-[14px]" key={project.name}>
                          <span
                            className="size-[5px] shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-white">{project.name}</span>
                          <span className="text-[12px] leading-4 text-[var(--track-text-muted)]">
                            {formatClockDuration(project.totalSeconds, durationFormat)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-[var(--track-border)] pt-4">
                      <OverviewEmptyState message="No tracked projects in this workspace yet." />
                    </div>
                  )}
                </div>
              </OverviewSurface>

              <OverviewSurface className="lg:min-h-[170px]">
                <div className="flex h-full flex-col gap-4">
                  <OverviewCardHeader
                    actionLabel="Open reports"
                    onAction={handleViewReports}
                    title="Time tracked to projects"
                  />
                  <div className="flex-1 border-t border-[var(--track-border)] pt-4">
                    <StatRing
                      accent="var(--track-warning-text-strong)"
                      percent={projectCoverage.percent}
                      size={84}
                      innerSize={58}
                      subtitle={projectCoverage.subtitle}
                      title={`${projectCoverage.percent}%`}
                    />
                  </div>
                  <AppButton size="sm" type="button" variant="secondary">
                    Add member to project
                  </AppButton>
                </div>
              </OverviewSurface>
            </div>
          </div>
        </div>
      </PageLayout>

      {inviteDialogOpen ? (
        <InviteMemberDialog
          email={inviteEmail}
          isPending={inviteMutation.isPending}
          onClose={() => setInviteDialogOpen(false)}
          onEmailChange={setInviteEmail}
          onRoleChange={setInviteRole}
          onSubmit={handleInviteSubmit}
          role={inviteRole}
        />
      ) : null}
    </>
  );
}

function OverviewSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return <SurfaceCard className={`h-full px-5 py-5 ${className}`}>{children}</SurfaceCard>;
}

function OverviewCardHeader({
  actionLabel,
  onAction,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[14px] font-semibold text-white">{title}</h2>
      {actionLabel && onAction ? (
        <AppButton onClick={onAction} size="sm" type="button" variant="secondary">
          {actionLabel}
        </AppButton>
      ) : null}
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg fill="none" height={6} viewBox="0 0 16 6" width={16}>
        <rect fill={color} height={6} rx={3} width={16} />
      </svg>
      <span>{label}</span>
    </span>
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
  const [hovered, setHovered] = useState(false);
  const clamped = Math.max(0, Math.min(100, percent));
  const outerRadius = size / 2;
  const innerRadius = innerSize / 2;
  const data = [
    { name: "filled", value: clamped, fill: accent },
    { name: "empty", value: 100 - clamped, fill: "var(--track-border)" },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? (
          <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--track-tooltip-surface)] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_var(--track-shadow-tooltip)]">
            <span className="font-semibold">{title}</span>
            <span className="ml-1.5 text-[var(--track-text-soft)]">{subtitle}</span>
          </div>
        ) : null}
        <PieChart height={size} width={size}>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius={innerRadius}
            isAnimationActive={false}
            outerRadius={outerRadius}
            paddingAngle={0}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell fill={entry.fill} key={entry.name ?? index} stroke="none" />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-[14px] font-semibold text-white">
          {title}
        </div>
      </div>
      <p className="text-center text-[11px] leading-4 text-[var(--track-text-muted)]">{subtitle}</p>
    </div>
  );
}

function OverviewEmptyState({ message }: { message: string }): ReactElement {
  return <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">{message}</p>;
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
    axisMaxSeconds,
    days: weekDays.map((day) => {
      const totalSeconds = totalsByDay.get(formatDateKey(day, timezone)) ?? 0;
      const { weekday, date, label } = formatShortAxisDay(day);
      return {
        date,
        heightPercent: Math.max(0, Math.min(100, (totalSeconds / axisMaxSeconds) * 100)),
        label,
        totalSeconds,
        weekday,
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
        color: project.color?.trim() || "var(--track-accent-secondary)",
        name: project.name?.trim() || "(No project)",
      },
    ]),
  );
  const grouped = new Map<number, { color: string; name: string; totalSeconds: number }>();

  for (const activity of activities) {
    const projectId = activity.project_id ?? 0;
    const project = projectById.get(projectId) ?? {
      color: "var(--track-accent-secondary)",
      name: projectId === 0 ? "Without project" : `Project #${projectId}`,
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

function formatShortAxisDay(day: Date): { weekday: string; date: string; label: string } {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return { weekday, date: `${month}/${d}`, label: `${weekday} ${month}/${d}` };
}

function memberTint(index: number): string {
  return [
    "var(--track-chart-palette-1)",
    "var(--track-chart-palette-2)",
    "var(--track-chart-palette-3)",
    "var(--track-accent)",
    "var(--track-chart-palette-4)",
  ][index % 5];
}

function memberLabel(member: ModelsMostActiveUser, nameById?: Map<number, string>): string {
  return (
    member.fullname?.trim() ||
    member.email?.trim() ||
    (member.user_id != null ? nameById?.get(member.user_id) : undefined) ||
    `User #${member.user_id ?? "?"}`
  );
}

function initialsForMember(member: ModelsMostActiveUser, nameById?: Map<number, string>): string {
  const label = memberLabel(member, nameById)
    .replace(/[^A-Za-z0-9\u4e00-\u9fa5 ]/g, "")
    .trim();
  return label ? label.slice(0, 1).toUpperCase() : "•";
}
