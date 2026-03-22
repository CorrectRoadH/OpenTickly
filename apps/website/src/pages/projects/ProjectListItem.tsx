import { AppButton } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import type { ProjectSummaryDto } from "../../shared/api/web-contract.ts";
import { useProjectMembersQuery } from "../../shared/query/web-shell.ts";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";
import { ProjectMembersSection } from "./ProjectMembersSection.tsx";

function projectStatusLabel(project: ProjectSummaryDto): string {
  return project.active ? "Active" : "Archived";
}

function projectTemplateLabel(project: ProjectSummaryDto): string {
  return project.template ? "Template" : "Standard";
}

type ProjectListItemProps = {
  mutationPending: boolean;
  onArchiveToggle: (project: ProjectSummaryDto) => Promise<void>;
  onPinToggle: (project: ProjectSummaryDto) => Promise<void>;
  project: ProjectSummaryDto;
  workspaceId: number;
};

export function ProjectListItem({
  mutationPending,
  onArchiveToggle,
  onPinToggle,
  project,
  workspaceId,
}: ProjectListItemProps): ReactElement {
  const projectMembersQuery = useProjectMembersQuery(project.id);
  const projectMembers = projectMembersQuery.data?.members ?? [];
  const memberCount = projectMembers.length;
  const statusLabel = projectStatusLabel(project);
  const pinActionLabel = project.pinned ? "Unpin" : "Pin";
  const archiveActionLabel = project.active ? "Archive" : "Restore";
  const templateLabel = projectTemplateLabel(project);

  return (
    <li aria-label={`Project ${project.name}`} className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{project.name}</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {statusLabel}
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
              {templateLabel}
            </span>
            {project.pinned ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                Pinned
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-600">Project · {statusLabel}</p>
          <p className="text-[11px] text-slate-500">
            Workspace {project.workspace_id} · {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>Client {project.client_name ?? "Unassigned"}</span>
            <span>Actual {project.actual_seconds ?? 0}s</span>
            <span>
              Current period {project.tracked_seconds_current_period ?? 0}s · Previous period{" "}
              {project.tracked_seconds_previous_period ?? 0}s
            </span>
            <span>
              Period {project.recurring_period ?? "none"}
              {project.recurring_period_start && project.recurring_period_end
                ? ` · ${project.recurring_period_start} to ${project.recurring_period_end}`
                : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            aria-label={`Project details for ${project.name}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800"
            href={`/workspaces/${workspaceId}/projects/${project.id}`}
          >
            Project details
          </a>
          <a
            aria-label={`Project tasks for ${project.name}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800"
            href={buildWorkspaceTasksPath({
              workspaceId,
              projectId: project.id,
            })}
          >
            Project tasks
          </a>
          <AppButton
            disabled={mutationPending}
            onClick={() => void onPinToggle(project)}
            type="button"
          >
            <span className="sr-only">
              {pinActionLabel} project {project.name}
            </span>
            <span aria-hidden="true">{pinActionLabel}</span>
          </AppButton>
          <AppButton
            disabled={mutationPending}
            onClick={() => void onArchiveToggle(project)}
            type="button"
          >
            <span className="sr-only">
              {archiveActionLabel} project {project.name}
            </span>
            <span aria-hidden="true">{archiveActionLabel}</span>
          </AppButton>
        </div>
      </div>

      <ProjectMembersSection
        isError={projectMembersQuery.isError}
        isPending={projectMembersQuery.isPending}
        members={projectMembers}
        project={project}
      />
    </li>
  );
}
