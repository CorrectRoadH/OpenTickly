import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useQueries } from "@tanstack/react-query";
import { type FormEvent, type ReactElement, useState } from "react";

import { webRequest } from "../../shared/api/web-client.ts";
import type { ProjectMembersEnvelopeDto } from "../../shared/api/web-contract.ts";
import { useCreateProjectMutation, useProjectsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

function formatProjectMemberRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function ProjectsPage(): ReactElement {
  const session = useSession();
  const projectsQuery = useProjectsQuery(session.currentWorkspace.id);
  const createProjectMutation = useCreateProjectMutation(session.currentWorkspace.id);
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
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

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createProjectMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: projectName,
    });
    setProjectName("");
    setStatus("Project created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="text-sm leading-6 text-slate-600">
            Track workspace projects with quick visibility and status cues.
          </p>
        </div>
        <AppButton type="button">Create project</AppButton>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateProject}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Project name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </label>
        <AppButton type="submit">Save project</AppButton>
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Projects list">
        {projects.map((project, index) => {
          const statusLabel = project.active ? "Active" : "Inactive";
          const projectMembersQuery = projectMembersQueries[index];
          const projectMembers = projectMembersQuery?.data?.members ?? [];
          const memberCount = projectMembers.length;

          return (
            <li key={project.id} aria-label={`Project ${project.name}`} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-600">Contract-backed project · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">
                    Workspace {project.workspace_id} · {memberCount} member
                    {memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {statusLabel}
                </span>
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
          The current Wave 2 slice exposes {projects.length} project
          {projects.length === 1 ? "" : "s"} for workspace {session.currentWorkspace.id}. Active
          projects ({activeCount}) remain available for new work; inactive projects stay visible for
          reference in this placeholder slice.
        </p>
      </div>
    </AppPanel>
  );
}
