import { type ReactElement, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { SurfaceCard } from "@opentoggl/web-ui";

import type {
  ModelsProjectStatistics,
  ModelsProjectUser,
} from "../../shared/api/generated/public-track/types.gen.ts";
import type { WorkspaceMember } from "../../shared/api/generated/web/types.gen.ts";
import {
  useProjectDetailQuery,
  useProjectMembersQuery,
  useProjectStatisticsQuery,
  useWorkspaceMembersQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { ProjectDetailLayout } from "./ProjectDetailLayout.tsx";

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
    <ProjectDetailLayout
      activeTab="team"
      projectId={projectId}
      workspaceId={workspaceId}
      sidebar={
        <aside className="pt-6 lg:pt-14">
          <div className="space-y-5">
            <StatBlock label="Total hours" value={formatDuration(totalSeconds)} />
            <StatBlock label="Billable hours" value={formatDuration(billableSeconds)} />
            <div className="flex justify-center pt-1">
              <ProjectDonut billableSeconds={billableSeconds} totalSeconds={totalSeconds} />
            </div>
            <TimelineBlock statistics={statisticsQuery.data} />
          </div>
        </aside>
      }
    >
      {projectQuery.isPending ? <ProjectDetailMessage message="Loading project team..." /> : null}
      {projectQuery.isError ? (
        <ProjectDetailMessage message="Project detail is temporarily unavailable." tone="error" />
      ) : null}

      {project ? (
        <section className="pt-3">
          <SurfaceCard className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-[var(--track-text-muted)]">
              <span className="flex size-4 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold text-white">
                i
              </span>
              <p>
                {project.is_private
                  ? "This project is private."
                  : "Everyone in this Workspace can see this Project."}{" "}
                <a className="text-[var(--track-accent-text)] underline" href="#privacy">
                  {project.is_private ? "Manage access" : "You can make it private"}
                </a>
              </p>
            </div>

            <div className="grid grid-cols-[minmax(220px,1.7fr)_112px_112px_160px] border-t border-[var(--track-border)] px-4 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              <HeaderCell label="All members/teams" />
              <HeaderCell label="Rate" />
              <HeaderCell label="Cost" />
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
          </SurfaceCard>
        </section>
      ) : null}
    </ProjectDetailLayout>
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

function ValueCell({ value }: { value: string }): ReactElement {
  return <div className="py-4 text-[14px] text-[var(--track-text-muted)]">{value}</div>;
}

function StatBlock({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums text-white">{value}</p>
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

function ProjectDonut({
  billableSeconds,
  totalSeconds,
}: {
  billableSeconds: number;
  totalSeconds: number;
}): ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const nonBillable = Math.max(0, totalSeconds - billableSeconds);
  const hasData = totalSeconds > 0;
  const data = hasData
    ? [
        { name: "Billable", value: billableSeconds, fill: "var(--track-chart-series-billable)" },
        ...(nonBillable > 0
          ? [
              {
                name: "Non-billable",
                value: nonBillable,
                fill: "var(--track-chart-series-non-billable)",
              },
            ]
          : []),
      ]
    : [{ name: "empty", value: 100, fill: "var(--track-border)" }];

  const percent =
    hasData && totalSeconds > 0 ? Math.round((billableSeconds / totalSeconds) * 100) : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 106, height: 106 }}>
      {hoveredIndex != null && data[hoveredIndex] && data[hoveredIndex].name !== "empty" ? (
        <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--track-tooltip-surface)] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_4px_12px_var(--track-shadow-tooltip)]">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ backgroundColor: data[hoveredIndex].fill }}
          />
          <span>{data[hoveredIndex].name}</span>
          <span className="ml-1.5 tabular-nums text-[var(--track-text-soft)]">
            {formatDuration(data[hoveredIndex].value)}
          </span>
        </div>
      ) : null}
      <PieChart height={106} width={106}>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={31}
          isAnimationActive={false}
          outerRadius={53}
          paddingAngle={0}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          onMouseEnter={(_, index) => hasData && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {data.map((entry, index) => (
            <Cell
              fill={entry.fill}
              key={entry.name ?? index}
              stroke="none"
              style={{ cursor: hasData ? "pointer" : "default", outline: "none" }}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] font-semibold text-white">
        {hasData ? `${percent}%` : ""}
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }): ReactElement {
  return (
    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--track-overlay-border)] text-[11px] font-semibold text-white">
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
