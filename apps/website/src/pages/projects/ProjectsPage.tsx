import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useMemo, useState } from "react";

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
import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";

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
    if (!trimmedName) return;
    await createProjectMutation.mutateAsync(trimmedName);
    setProjectName("");
    setComposerOpen(false);
    setStatusMessage("Project created");
    if (statusFilter !== "all") await navigateToStatus("all");
  }

  async function handlePinToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) return;
    if (project.pinned) {
      await unpinProjectMutation.mutateAsync(project.id);
      setStatusMessage(`Unpinned ${project.name}`);
      return;
    }
    await pinProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Pinned ${project.name}`);
  }

  async function handleArchiveToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) return;
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
      className="min-w-[1180px] bg-[var(--track-surface)] text-white"
      data-testid="projects-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex h-[66px] items-center justify-between px-5">
          <h1 className="text-[21px] font-semibold text-white">Projects</h1>
          <button
            className="flex h-9 items-center gap-2 rounded-md bg-[var(--track-button)] px-4 text-[13px] font-medium text-black"
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-4" name="plus" />
            New project
          </button>
        </div>
        <div className="flex h-[50px] items-center gap-4 border-t border-[var(--track-border)] px-5">
          <label className="relative">
            <select
              aria-label="Project status filter"
              className="h-9 appearance-none rounded-md border border-[var(--track-border)] bg-[#181818] px-3 pr-8 text-[13px] text-white"
              onChange={(event) => void navigateToStatus(event.target.value as ProjectStatusFilter)}
              value={statusFilter}
            >
              <option value="all">All, except Archived</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <TrackingIcon className="size-3" name="chevron-down" />
            </span>
          </label>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <FilterChip label="Client" />
            <FilterChip label="Member" />
            <FilterChip label="Project name" />
            <FilterChip disabled label="Template" />
          </div>
          {statusMessage ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      {composerOpen ? (
        <form
          className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3"
          onSubmit={handleCreateProject}
        >
          <input
            className="h-9 w-[320px] rounded-md border border-[var(--track-border)] bg-[#181818] px-3 text-[13px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            value={projectName}
          />
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[13px] font-medium text-black disabled:opacity-60"
            disabled={mutationPending || !projectName.trim()}
            type="submit"
          >
            Save project
          </button>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[13px] text-[var(--track-text-muted)]"
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
          <div className="overflow-hidden">
            <div className="grid grid-cols-[44px_minmax(260px,1.8fr)_180px_190px_120px_180px_60px_50px] border-b border-[var(--track-border)] px-5 text-[10px] uppercase tracking-[0.05em] text-[var(--track-text-muted)]">
              <CellHeader className="h-[50px]" />
              <CellHeader className="h-[50px]">Project</CellHeader>
              <CellHeader className="h-[50px]">Client</CellHeader>
              <CellHeader className="h-[50px]">Timeframe</CellHeader>
              <CellHeader className="h-[50px]">Time status</CellHeader>
              <CellHeader className="h-[50px]">Team</CellHeader>
              <CellHeader className="h-[50px]">Pinned</CellHeader>
              <CellHeader className="h-[50px]" />
            </div>
            {projects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-[44px_minmax(260px,1.8fr)_180px_190px_120px_180px_60px_50px] items-center border-b border-[var(--track-border)] px-5 text-[13px]"
              >
                <div className="flex h-[50px] items-center">
                  <span className="size-[14px] rounded-[4px] border border-[var(--track-border)]" />
                </div>
                <div className="flex h-[50px] items-center gap-3 overflow-hidden">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: resolveProjectColor(project) }}
                  />
                  <a
                    className="truncate text-[13px] font-medium"
                    href={`/workspaces/${workspaceId}/projects/${project.id}`}
                    style={{ color: resolveProjectColor(project) }}
                  >
                    {project.name ?? "Untitled project"}
                  </a>
                </div>
                <TableValue>{project.client_name ?? ""}</TableValue>
                <TableValue>
                  {project.current_period?.start_date ?? project.start_date ?? "-"}
                </TableValue>
                <TableValue>{formatProjectHours(project)}</TableValue>
                <TableValue>{project.is_private ? "Private" : "Everyone"}</TableValue>
                <div className="flex h-[50px] items-center">
                  <button
                    className={`flex size-8 items-center justify-center rounded-md ${project.pinned ? "text-[var(--track-accent)]" : "text-[var(--track-text-muted)] hover:text-white"}`}
                    onClick={() => void handlePinToggle(project)}
                    type="button"
                  >
                    <TrackingIcon className="size-4" name="projects" />
                  </button>
                </div>
                <div className="flex h-[50px] items-center justify-end">
                  <button
                    className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] hover:bg-[#222222] hover:text-white"
                    onClick={() => void handleArchiveToggle(project)}
                    title={project.active ? "Archive project" : "Restore project"}
                    type="button"
                  >
                    <TrackingIcon className="size-4" name="more" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SurfaceMessage message={emptyStateTitle(statusFilter)} />
        )
      ) : null}
    </div>
  );
}

function FilterChip({ disabled = false, label }: { disabled?: boolean; label: string }) {
  return (
    <span
      className={`flex h-[34px] items-center rounded-md border px-3 text-[12px] normal-case tracking-normal ${disabled ? "border-[var(--track-border)] text-[#5d5d5d]" : "border-[var(--track-border)] text-white"}`}
    >
      {label}
    </span>
  );
}

function CellHeader({
  children,
  className = "",
}: {
  children?: ReactElement | string;
  className?: string;
}) {
  return <div className={`flex items-center ${className}`}>{children}</div>;
}

function TableValue({ children }: { children: string }) {
  return <div className="flex h-[50px] items-center text-[12px] text-white">{children}</div>;
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
      className={`px-5 py-8 text-sm ${tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"}`}
    >
      {message}
    </div>
  );
}

function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) return data as GithubComTogglTogglApiInternalModelsProject[];
  if (hasProjectArray(data, "projects")) return data.projects;
  if (hasProjectArray(data, "data")) return data.data;
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
  if (statusFilter === "archived") return "No archived projects in this workspace yet.";
  if (statusFilter === "active") return "No active projects match this view.";
  return "No projects in this workspace yet.";
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  if (project.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(project.color)) return project.color;
  const palette = ["#00b8ff", "#ff5d5d", "#ffcf33", "#00d084", "#ff8a3d", "#ff64d2", "#8f7cff"];
  const seed = project.name ?? "project";
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
