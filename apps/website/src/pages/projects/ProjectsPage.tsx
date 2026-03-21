import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useQueries } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";

import { webRequest } from "../../shared/api/web-client.ts";
import type {
  ProjectMembersEnvelopeDto,
  ProjectSummaryDto,
} from "../../shared/api/web-contract.ts";
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

function formatProjectMemberRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function projectStatusLabel(project: ProjectSummaryDto): string {
  return project.active ? "Active" : "Archived";
}

export function ProjectsPage(): ReactElement {
  const session = useSession();
  const [projectName, setProjectName] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectListStatusFilter>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const projectsQuery = useProjectsQuery(session.currentWorkspace.id, statusFilter);
  const createProjectMutation = useCreateProjectMutation(session.currentWorkspace.id);
  const archiveProjectMutation = useArchiveProjectMutation(session.currentWorkspace.id);
  const restoreProjectMutation = useRestoreProjectMutation(session.currentWorkspace.id);
  const pinProjectMutation = usePinProjectMutation(session.currentWorkspace.id);
  const unpinProjectMutation = useUnpinProjectMutation(session.currentWorkspace.id);
  const projects = projectsQuery.data?.projects ?? [];
  const projectMembersQueries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () =>
        webRequest<ProjectMembersEnvelopeDto>(`/web/v1/projects/${project.id}/members`),
      queryKey: ["project-members", project.id],
    })),
  });

  if (projectsQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading projects…</p>
      </AppPanel>
    );
  }

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
      workspace_id: session.currentWorkspace.id,
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

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="text-sm leading-6 text-slate-600">
            Transition state. This page now covers status filtering and archive/pin controls, but
            the documented project page still needs task/detail entry points and template/statistics
            flows.
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
        {statusMessage ? (
          <p className="text-sm font-medium text-emerald-700">{statusMessage}</p>
        ) : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Projects list">
        {projects.map((project, index) => {
          const statusLabel = projectStatusLabel(project);
          const pinActionLabel = project.pinned ? "Unpin" : "Pin";
          const archiveActionLabel = project.active ? "Archive" : "Restore";
          const projectMembersQuery = projectMembersQueries[index];
          const projectMembers = projectMembersQuery?.data?.members ?? [];
          const memberCount = projectMembers.length;

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
                    Workspace {project.workspace_id} · {memberCount} member
                    {memberCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AppButton
                    disabled={mutationPending}
                    onClick={() => void handlePinToggle(project)}
                    type="button"
                  >
                    <span className="sr-only">
                      {pinActionLabel} project {project.name}
                    </span>
                    <span aria-hidden="true">{pinActionLabel}</span>
                  </AppButton>
                  <AppButton
                    disabled={mutationPending}
                    onClick={() => void handleArchiveToggle(project)}
                    type="button"
                  >
                    <span className="sr-only">
                      {archiveActionLabel} project {project.name}
                    </span>
                    <span aria-hidden="true">{archiveActionLabel}</span>
                  </AppButton>
                </div>
              </div>

              <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Project members
                </p>

                {projectMembersQuery?.isPending ? (
                  <p className="mt-2 text-sm text-slate-600">Loading members…</p>
                ) : null}

                {projectMembersQuery?.isError ? (
                  <p className="mt-2 text-sm text-rose-700">Unable to load members.</p>
                ) : null}

                {!projectMembersQuery?.isPending && !projectMembersQuery?.isError ? (
                  projectMembers.length > 0 ? (
                    <ul className="mt-2 space-y-2" aria-label={`${project.name} members`}>
                      {projectMembers.map((member) => (
                        <li
                          key={`${member.project_id}-${member.member_id}-${member.role}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          <span className="font-semibold text-slate-900">
                            Member {member.member_id}
                          </span>
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
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Transition state. Showing {projects.length} project{projects.length === 1 ? "" : "s"} for
          workspace {session.currentWorkspace.id}, with {activeCount} active and {pinnedCount}{" "}
          pinned. Exit when this page adds task/detail entry points plus template/statistics flows
          with page-flow evidence.
        </p>
      </div>
    </AppPanel>
  );
}
