import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
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

type ProjectsPageProps = {
  statusFilter: ProjectStatusFilter;
};

export function ProjectsPage({ statusFilter }: ProjectsPageProps): ReactElement {
  const navigate = useNavigate();
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [projectName, setProjectName] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const projectsQuery = useProjectsQuery(workspaceId, statusFilter);
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const archiveProjectMutation = useArchiveProjectMutation(workspaceId);
  const restoreProjectMutation = useRestoreProjectMutation(workspaceId);
  const pinProjectMutation = usePinProjectMutation(workspaceId);
  const unpinProjectMutation = useUnpinProjectMutation(workspaceId);
  const projects = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
  const mutationPending =
    createProjectMutation.isPending ||
    archiveProjectMutation.isPending ||
    restoreProjectMutation.isPending ||
    pinProjectMutation.isPending ||
    unpinProjectMutation.isPending;

  async function navigateToStatus(nextStatus: ProjectStatusFilter) {
    await navigate({
      params: { workspaceId: String(workspaceId) },
      search: { status: nextStatus },
      to: "/workspaces/$workspaceId/projects",
    });
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      return;
    }

    await createProjectMutation.mutateAsync(trimmedName);
    setProjectName("");
    setComposerOpen(false);
    setStatusMessage("Project created");
    if (statusFilter !== "all") {
      await navigateToStatus("all");
    }
  }

  async function handlePinToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    if (project.pinned) {
      await unpinProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Unpinned ${project.name}`);
      return;
    }

    await pinProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Pinned ${project.name}`);
  }

  async function handleArchiveToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    if (project.active) {
      await archiveProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Archived ${project.name}`);
      return;
    }

    await restoreProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Restored ${project.name}`);
  }

  return (
    <div
      className="min-w-[1384px] bg-[var(--track-surface)] text-white"
      data-testid="projects-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex h-[66px] items-center justify-between px-5">
          <h1 className="text-[21px] font-medium text-white">Projects</h1>
          <button
            className="flex h-[28px] items-center gap-1 rounded-md bg-[var(--track-button)] px-3 text-[11px] font-medium text-black"
            data-testid="projects-create-button"
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New project
          </button>
        </div>
        <div
          className="flex h-[46px] items-center gap-4 border-t border-[var(--track-border)] px-5"
          data-testid="projects-filter-bar"
        >
          <label className="relative">
            <select
              aria-label="Project status filter"
              className="h-7 appearance-none rounded-md border border-[var(--track-border)] bg-[#171717] px-3 pr-8 text-[11px] text-white"
              onChange={(event) => void navigateToStatus(event.target.value as ProjectStatusFilter)}
              value={statusFilter}
            >
              <option value="all">Show All, except Archived</option>
              <option value="active">Show active</option>
              <option value="archived">Show archived</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <TrackingIcon className="size-3" name="chevron-down" />
            </span>
          </label>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <FilterChip label="Client" />
            <FilterChip label="Member" />
            <FilterChip label="Project name" />
            <FilterChip disabled label="Template" />
          </div>
          {statusMessage ? (
            <span className="ml-auto text-[11px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      {composerOpen ? (
        <form
          className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3"
          data-testid="projects-create-form"
          onSubmit={handleCreateProject}
        >
          <label className="sr-only" htmlFor="project-name">
            Project name
          </label>
          <input
            className="h-9 w-[320px] rounded-md border border-[var(--track-border)] bg-[#181818] px-3 text-[13px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            id="project-name"
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            value={projectName}
          />
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={mutationPending || !projectName.trim()}
            type="submit"
          >
            Save project
          </button>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={() => setComposerOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {projectsQuery.isPending ? <SurfaceMessage message="Loading projects..." /> : null}
      {projectsQuery.isError ? (
        <SurfaceMessage message="Project directory is temporarily unavailable." tone="error" />
      ) : null}
      {!projectsQuery.isPending && !projectsQuery.isError ? (
        projects.length > 0 ? (
          <div data-testid="projects-list">
            <div className="grid grid-cols-[42px_minmax(240px,1.8fr)_98px_130px_94px_94px_56px_42px] border-b border-[var(--track-border)] px-5 text-[9px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              <HeaderCell />
              <HeaderCell>Project</HeaderCell>
              <HeaderCell>Client</HeaderCell>
              <HeaderCell>Timeframe</HeaderCell>
              <HeaderCell>Time status</HeaderCell>
              <HeaderCell>Team</HeaderCell>
              <HeaderCell>Pinned</HeaderCell>
              <HeaderCell />
            </div>
            {projects.map((project) => (
              <div
                className="grid grid-cols-[42px_minmax(240px,1.8fr)_98px_130px_94px_94px_56px_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
                key={project.id}
              >
                <div className="flex h-[54px] items-center">
                  <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
                </div>
                <div className="flex h-[54px] items-center gap-3 overflow-hidden">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: resolveProjectColor(project) }}
                  />
                  <a
                    className="truncate font-medium"
                    href={`/workspaces/${workspaceId}/projects/${project.id}`}
                    style={{ color: resolveProjectColor(project) }}
                  >
                    {project.name ?? "Untitled project"}
                  </a>
                </div>
                <TableCell>{project.client_name ?? ""}</TableCell>
                <TableCell>
                  {project.current_period?.start_date ?? project.start_date ?? "-"}
                </TableCell>
                <TableCell>{formatProjectHours(project)}</TableCell>
                <TableCell>{project.is_private ? "Private" : "Everyone"}</TableCell>
                <div className="flex h-[54px] items-center">
                  <button
                    aria-label={`${project.pinned ? "Unpin" : "Pin"} ${project.name}`}
                    className={`flex size-8 items-center justify-center rounded-md transition ${
                      project.pinned
                        ? "text-[var(--track-accent)]"
                        : "text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
                    }`}
                    onClick={() => void handlePinToggle(project)}
                    type="button"
                  >
                    <TrackingIcon className="size-4" name="projects" />
                  </button>
                </div>
                <div className="flex h-[54px] items-center justify-end">
                  <button
                    aria-label={`${project.active ? "Archive" : "Restore"} ${project.name}`}
                    className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                    onClick={() => void handleArchiveToggle(project)}
                    type="button"
                  >
                    <TrackingIcon className="size-4" name="more" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10" data-testid="projects-empty-state">
            <p className="text-sm text-[var(--track-text-muted)]">
              {emptyStateTitle(statusFilter)}
            </p>
          </div>
        )
      ) : null}

      {!projectsQuery.isPending && !projectsQuery.isError ? (
        <div
          className="flex items-center justify-between border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
          data-testid="projects-summary"
        >
          <span>
            Showing {projects.length} projects in workspace {workspaceId}.
          </span>
          <span>Pinned: {projects.filter((project) => project.pinned).length}</span>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ disabled = false, label }: { disabled?: boolean; label: string }) {
  return (
    <span
      className={`flex h-[26px] items-center gap-1 rounded-md border px-2.5 text-[11px] normal-case tracking-normal ${
        disabled
          ? "border-[var(--track-border)] text-[#5d5d5d]"
          : "border-[var(--track-border)] text-white"
      }`}
    >
      {label}
    </span>
  );
}

function HeaderCell({ children }: { children?: string }) {
  return <div className="flex h-[34px] items-center">{children}</div>;
}

function TableCell({ children }: { children: string }) {
  return <div className="flex h-[54px] items-center text-[12px] text-white">{children}</div>;
}

function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
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

function formatProjectHours(project: GithubComTogglTogglApiInternalModelsProject): string {
  const seconds = project.actual_seconds ?? Math.round((project.actual_hours ?? 0) * 3600);
  return `${Math.round((seconds / 3600) * 10) / 10 || 0} h`;
}

function emptyStateTitle(statusFilter: ProjectStatusFilter): string {
  if (statusFilter === "archived") {
    return "No archived projects in this workspace yet.";
  }

  if (statusFilter === "active") {
    return "No active projects match this view.";
  }

  return "No projects in this workspace yet.";
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  if (project.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(project.color)) {
    return project.color;
  }

  const palette = ["#00b8ff", "#ff5d5d", "#ffcf33", "#00d084", "#ff8a3d", "#ff64d2", "#8f7cff"];
  const seed = project.name ?? "project";
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return palette[hash % palette.length];
}
