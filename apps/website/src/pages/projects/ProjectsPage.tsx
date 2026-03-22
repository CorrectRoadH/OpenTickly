import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  usePinProjectMutation,
  useProjectsQuery,
  useRestoreProjectMutation,
  useUnpinProjectMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import type { ProjectStatusFilter } from "../../shared/url-state/projects-location.ts";
import { ProjectListItem } from "./ProjectListItem.tsx";

type ProjectListItemView = GithubComTogglTogglApiInternalModelsProject;

function emptyStateTitle(statusFilter: ProjectStatusFilter): string {
  if (statusFilter === "archived") {
    return "No archived projects in this workspace yet.";
  }

  if (statusFilter === "active") {
    return "No active projects match this view.";
  }

  return "No projects in this workspace yet.";
}

type ProjectsPageProps = {
  statusFilter: ProjectStatusFilter;
};

export function ProjectsPage({ statusFilter }: ProjectsPageProps): ReactElement {
  const navigate = useNavigate();
  const session = useSession();
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const [projectName, setProjectName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const workspaceId = session.currentWorkspace.id;
  const projectsQuery = useProjectsQuery(workspaceId, statusFilter);
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const archiveProjectMutation = useArchiveProjectMutation(workspaceId);
  const restoreProjectMutation = useRestoreProjectMutation(workspaceId);
  const pinProjectMutation = usePinProjectMutation(workspaceId);
  const unpinProjectMutation = useUnpinProjectMutation(workspaceId);
  const projects = normalizeProjects(projectsQuery.data);
  const activeCount = projects.filter((project) => project.active).length;
  const pinnedCount = projects.filter((project) => project.pinned).length;
  const mutationPending =
    createProjectMutation.isPending ||
    archiveProjectMutation.isPending ||
    restoreProjectMutation.isPending ||
    pinProjectMutation.isPending ||
    unpinProjectMutation.isPending;

  async function navigateToStatus(nextStatus: ProjectStatusFilter) {
    await navigate({
      params: {
        workspaceId: String(workspaceId),
      },
      search: { status: nextStatus },
      to: "/workspaces/$workspaceId/projects",
    });
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createProjectMutation.mutateAsync(projectName);

    if (statusFilter !== "all") {
      await navigateToStatus("all");
    }

    setProjectName("");
    setStatusMessage("Project created");
  }

  async function handleArchiveToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.active) {
      await archiveProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Archived project ${project.name}`);
      return;
    }

    await restoreProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Restored project ${project.name}`);
  }

  async function handlePinToggle(project: GithubComTogglTogglApiInternalModelsProject) {
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
    <AppPanel className="bg-white/95" data-testid="projects-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="text-sm leading-6 text-slate-600">Project directory</p>
          <p className="text-sm leading-6 text-slate-600">
            Browse the project directory, open task entry points, and keep archive or pinned
            project state visible from one workspace page.
          </p>
        </div>
        <AppButton onClick={() => createInputRef.current?.focus()} type="button">
          Create project
        </AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3" data-testid="projects-filter-bar">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            aria-label="Project status filter"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            onChange={(event) => void navigateToStatus(event.target.value as ProjectStatusFilter)}
            value={statusFilter}
          >
            <option value="all">All projects</option>
            <option value="active">Active projects</option>
            <option value="archived">Archived projects</option>
          </select>
        </label>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" data-testid="projects-create-form" onSubmit={handleCreateProject}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Project name
          <input
            ref={createInputRef}
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
        projects.length > 0 ? (
          <ul className="mt-6 divide-y divide-slate-200" aria-label="Projects list" data-testid="projects-list">
            {projects.map((project) => (
              <ProjectListItem
                key={project.id}
                mutationPending={mutationPending}
                onArchiveToggle={handleArchiveToggle}
                onPinToggle={handlePinToggle}
                project={project}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        ) : (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-700" data-testid="projects-empty-state">
            <p className="font-semibold text-slate-900">{emptyStateTitle(statusFilter)}</p>
            <p className="mt-2">
              Adjust the filter or create a project to keep project tasks, members, and reporting
              links discoverable from the project page.
            </p>
          </section>
        )
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" data-testid="projects-summary">
        <p>Showing {projects.length} projects in workspace {workspaceId}.</p>
        <p className="mt-1">
          Active: {activeCount} · Pinned: {pinnedCount}
        </p>
      </div>
    </AppPanel>
  );
}

function normalizeProjects(data: unknown): ProjectListItemView[] {
  if (Array.isArray(data)) {
    return data as ProjectListItemView[];
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
): value is Record<typeof key, ProjectListItemView[]> {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key]);
}
