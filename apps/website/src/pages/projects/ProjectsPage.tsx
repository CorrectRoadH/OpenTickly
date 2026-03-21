import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useQueries } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";

import { webRequest } from "../../shared/api/web-client.ts";
import type { ProjectMembersEnvelopeDto, ProjectSummaryDto } from "../../shared/api/web-contract.ts";
import {
  type ProjectListStatusFilter,
  useArchiveProjectMutation,
  useCreateProjectMutation,
  usePinProjectMutation,
  useProjectsQuery,
  useRestoreProjectMutation,
  useUnpinProjectMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildWorkspaceTasksPath } from "../../shared/url-state/tasks-location.ts";

function formatProjectMemberRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function projectStatusLabel(project: ProjectSummaryDto): string {
  return project.active ? "Active" : "Archived";
}

function emptyStateTitle(statusFilter: ProjectListStatusFilter): string {
  if (statusFilter === "archived") {
    return "No archived projects in this workspace yet.";
  }

  if (statusFilter === "active") {
    return "No active projects match this view.";
  }

  return "No projects in this workspace yet.";
}

type ProjectMembersSectionProps = {
  isError: boolean;
  isPending: boolean;
  members: ProjectMembersEnvelopeDto["members"];
  project: ProjectSummaryDto;
};

function ProjectMembersSection({
  isError,
  isPending,
  members,
  project,
}: ProjectMembersSectionProps): ReactElement {
  
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Project members
      </p>

      {isPending ? (
        <p className="mt-2 text-sm text-slate-600">Loading members…</p>
      ) : null}

      {isError ? (
        <p className="mt-2 text-sm text-rose-700">Unable to load members.</p>
      ) : null}

      {!isPending && !isError ? (
        members.length > 0 ? (
          <ul className="mt-2 space-y-2" aria-label={`${project.name} members`}>
            {members.map((member) => (
              <li
                key={`${member.project_id}-${member.member_id}-${member.role}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700"
              >
                <span className="font-semibold text-slate-900">Member {member.member_id}</span>
                <span>Project {member.project_id}</span>
                <span>{formatProjectMemberRole(member.role)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No members assigned</p>
        )
      ) : null}
    </section>
  );
}

type ProjectListItemProps = {
  mutationPending: boolean;
  onArchiveToggle: (project: ProjectSummaryDto) => Promise<void>;
  onPinToggle: (project: ProjectSummaryDto) => Promise<void>;
  project: ProjectSummaryDto;
  projectMembers: ProjectMembersEnvelopeDto["members"];
  projectMembersError: boolean;
  projectMembersPending: boolean;
  workspaceId: number;
};

function ProjectListItem({
  mutationPending,
  onArchiveToggle,
  onPinToggle,
  project,
  projectMembers,
  projectMembersError,
  projectMembersPending,
  workspaceId,
}: ProjectListItemProps): ReactElement {
  const memberCount = projectMembers.length;
  const statusLabel = projectStatusLabel(project);
  const pinActionLabel = project.pinned ? "Unpin" : "Pin";
  const archiveActionLabel = project.active ? "Archive" : "Restore";

  return (
    <li key={project.id} aria-label={`Project ${project.name}`} className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{project.name}</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {statusLabel}
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
        isError={projectMembersError}
        isPending={projectMembersPending}
        members={projectMembers}
        project={project}
      />
    </li>
  );
}

export function ProjectsPage(): ReactElement {
  const session = useSession();
  const [projectName, setProjectName] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectListStatusFilter>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const workspaceId = session.currentWorkspace.id;
  const projectsQuery = useProjectsQuery(workspaceId, statusFilter);
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const archiveProjectMutation = useArchiveProjectMutation(workspaceId);
  const restoreProjectMutation = useRestoreProjectMutation(workspaceId);
  const pinProjectMutation = usePinProjectMutation(workspaceId);
  const unpinProjectMutation = useUnpinProjectMutation(workspaceId);
  const projects = projectsQuery.data?.projects ?? [];
  const projectMembersQueries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () =>
        webRequest<ProjectMembersEnvelopeDto>(`/web/v1/projects/${project.id}/members`),
      queryKey: ["project-members", project.id],
    })),
  });
  const activeCount = projects.filter((project) => project.active).length;
  const pinnedCount = projects.filter((project) => project.pinned).length;
  const mutationPending =
    createProjectMutation.isPending ||
    archiveProjectMutation.isPending ||
    restoreProjectMutation.isPending ||
    pinProjectMutation.isPending ||
    unpinProjectMutation.isPending;

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createProjectMutation.mutateAsync({
      workspace_id: workspaceId,
      name: projectName,
    });
    setProjectName("");
    setStatusFilter("all");
    setStatusMessage("Project created");
  }

  async function handleArchiveToggle(project: ProjectSummaryDto) {
    if (project.active) {
      await archiveProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Archived project ${project.name}`);
      return;
    }

    await restoreProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Restored project ${project.name}`);
  }

  async function handlePinToggle(project: ProjectSummaryDto) {
    if (project.pinned) {
      await unpinProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Unpinned project ${project.name}`);
      return;
    }

    await pinProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Pinned project ${project.name}`);
  }

  if (projectsQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading projects…</p>
      </AppPanel>
    );
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="text-sm leading-6 text-slate-600">Project directory</p>
          <p className="text-sm leading-6 text-slate-600">
            Browse the project directory, open task entry points, and keep archive or pinned
            project state visible from one workspace page.
          </p>
        </div>
        <AppButton type="button">Create project</AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            aria-label="Project status filter"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            onChange={(event) => setStatusFilter(event.target.value as ProjectListStatusFilter)}
            value={statusFilter}
          >
            <option value="all">All projects</option>
            <option value="active">Active projects</option>
            <option value="archived">Archived projects</option>
          </select>
        </label>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateProject}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Project name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            onChange={(event) => setProjectName(event.target.value)}
            value={projectName}
          />
        </label>
        <AppButton disabled={mutationPending} type="submit">
          Save project
        </AppButton>
        {statusMessage ? <p className="text-sm font-medium text-emerald-700">{statusMessage}</p> : null}
      </form>

      {projectsQuery.isError ? (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <p className="font-semibold">Project directory is temporarily unavailable.</p>
          <p className="mt-2">
            Reload after the catalog service recovers. Existing project detail, task, and archive
            entry points remain unchanged until this page can fetch the latest project list.
          </p>
        </section>
      ) : null}

      {!projectsQuery.isError ? (
        <>
          {projects.length > 0 ? (
            <ul className="mt-6 divide-y divide-slate-200" aria-label="Projects list">
              {projects.map((project, index) => (
                <ProjectListItem
                  key={project.id}
                  mutationPending={mutationPending}
                  onArchiveToggle={handleArchiveToggle}
                  onPinToggle={handlePinToggle}
                  project={project}
                  projectMembers={projectMembersQueries[index]?.data?.members ?? []}
                  projectMembersError={projectMembersQueries[index]?.isError ?? false}
                  projectMembersPending={projectMembersQueries[index]?.isPending ?? false}
                  workspaceId={workspaceId}
                />
              ))}
            </ul>
          ) : (
            <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{emptyStateTitle(statusFilter)}</p>
              <p className="mt-2">
                Adjust the filter or create a project to keep project tasks, members, and
                reporting links discoverable from the project page.
              </p>
            </section>
          )}
        </>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>Showing {projects.length} projects in workspace {workspaceId}.</p>
        <p className="mt-1">
          Active: {activeCount} · Pinned: {pinnedCount}
        </p>
      </div>
    </AppPanel>
  );
}
