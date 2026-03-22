import { AppButton } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import { useProjectMembersQuery } from "../../shared/query/web-shell.ts";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";
import { ProjectMembersSection } from "./ProjectMembersSection.tsx";

function projectStatusLabel(project: GithubComTogglTogglApiInternalModelsProject): string {
  return project.active ? "Active" : "Archived";
}

function projectTemplateLabel(project: GithubComTogglTogglApiInternalModelsProject): string {
  return project.template ? "Template" : "Standard";
}

type ProjectListItemProps = {
  mutationPending: boolean;
  onArchiveToggle: (project: GithubComTogglTogglApiInternalModelsProject) => Promise<void>;
  onPinToggle: (project: GithubComTogglTogglApiInternalModelsProject) => Promise<void>;
  project: GithubComTogglTogglApiInternalModelsProject;
  workspaceId: number;
};

export function ProjectListItem({
  mutationPending,
  onArchiveToggle,
  onPinToggle,
  project,
  workspaceId,
}: ProjectListItemProps): ReactElement {
  const projectMembersQuery = useProjectMembersQuery(workspaceId, project.id ?? 0);
  const projectMembers = normalizeProjectMembers(projectMembersQuery.data);
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
            Workspace {project.wid} · {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>Client {project.client_name ?? "Unassigned"}</span>
            <span>Actual {project.actual_seconds ?? 0}s</span>
            <span>
              Period {project.recurring ? "recurring" : "none"}
              {project.current_period?.start_date && project.current_period?.end_date
                ? ` · ${project.current_period.start_date} to ${project.current_period.end_date}`
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

function normalizeProjectMembers(data: unknown): Array<{ member_id?: number | null }> {
  if (Array.isArray(data)) {
    return data as Array<{ member_id?: number | null }>;
  }

  if (hasMembersArray(data)) {
    return data.members;
  }

  return [];
}

function hasMembersArray(
  value: unknown,
): value is { members: Array<{ member_id?: number | null }> } {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as { members?: unknown }).members);
}
