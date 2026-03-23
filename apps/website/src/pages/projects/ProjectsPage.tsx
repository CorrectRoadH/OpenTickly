import { useNavigate } from "@tanstack/react-router";
import { type ReactElement, useMemo, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  DEFAULT_PROJECT_COLOR,
  resolveProjectColorValue,
  TRACK_COLOR_SWATCHES,
} from "../../shared/lib/project-colors.ts";
import {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  usePinProjectMutation,
  useProjectsQuery,
  useRestoreProjectMutation,
  useUnpinProjectMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import {
  DirectoryFilterChip,
  DirectoryHeaderCell,
  DirectorySurfaceMessage,
  DirectoryTableCell,
} from "../../shared/ui/TrackDirectoryPrimitives.tsx";
import type { ProjectStatusFilter } from "../../shared/url-state/projects-location.ts";
import {
  emptyProjectsStateTitle,
  formatProjectHours,
  normalizeProjects,
} from "./projects-page-helpers.ts";

type ProjectsPageProps = {
  statusFilter: ProjectStatusFilter;
};

export function ProjectsPage({ statusFilter }: ProjectsPageProps): ReactElement {
  const navigate = useNavigate();
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState<string>(DEFAULT_PROJECT_COLOR);
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

  async function handleCreateProject() {
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      return;
    }

    await createProjectMutation.mutateAsync({
      color: projectColor,
      name: trimmedName,
    });
    setProjectColor(DEFAULT_PROJECT_COLOR);
    setProjectName("");
    setCreateDialogOpen(false);
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
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="projects-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-medium text-white">Projects</h1>
          <button
            className="flex h-[28px] items-center gap-1 rounded-md bg-[var(--track-button)] px-3 text-[11px] font-medium text-black"
            data-testid="projects-create-button"
            onClick={() => setCreateDialogOpen(true)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New project
          </button>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2"
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
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <DirectoryFilterChip label="Client" />
            <DirectoryFilterChip label="Member" />
            <DirectoryFilterChip label="Project name" />
            <DirectoryFilterChip disabled label="Template" />
          </div>
          {statusMessage ? (
            <span className="ml-auto text-[11px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      {projectsQuery.isPending ? <DirectorySurfaceMessage message="Loading projects..." /> : null}
      {projectsQuery.isError ? (
        <DirectorySurfaceMessage
          message="Project directory is temporarily unavailable."
          tone="error"
        />
      ) : null}
      {!projectsQuery.isPending && !projectsQuery.isError ? (
        projects.length > 0 ? (
          <div data-testid="projects-list">
            <div className="grid grid-cols-[42px_minmax(240px,1.8fr)_98px_130px_94px_94px_56px_42px] border-b border-[var(--track-border)] px-5 text-[9px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              <DirectoryHeaderCell />
              <DirectoryHeaderCell>Project</DirectoryHeaderCell>
              <DirectoryHeaderCell>Client</DirectoryHeaderCell>
              <DirectoryHeaderCell>Timeframe</DirectoryHeaderCell>
              <DirectoryHeaderCell>Time status</DirectoryHeaderCell>
              <DirectoryHeaderCell>Team</DirectoryHeaderCell>
              <DirectoryHeaderCell>Pinned</DirectoryHeaderCell>
              <DirectoryHeaderCell />
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
                <DirectoryTableCell>{project.client_name ?? ""}</DirectoryTableCell>
                <DirectoryTableCell>
                  {project.current_period?.start_date ?? project.start_date ?? "-"}
                </DirectoryTableCell>
                <DirectoryTableCell>{formatProjectHours(project)}</DirectoryTableCell>
                <DirectoryTableCell>
                  {project.is_private ? "Private" : "Everyone"}
                </DirectoryTableCell>
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
              {emptyProjectsStateTitle(statusFilter)}
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

      {createDialogOpen ? (
        <CreateNameDialog
          colorOptions={TRACK_COLOR_SWATCHES}
          isPending={mutationPending}
          nameLabel="Project name"
          namePlaceholder="Project name"
          nameValue={projectName}
          onClose={() => {
            setCreateDialogOpen(false);
          }}
          onColorSelect={setProjectColor}
          onNameChange={setProjectName}
          onSubmit={() => {
            void handleCreateProject();
          }}
          selectedColor={projectColor}
          submitLabel="Create project"
          title="Create new project"
        />
      ) : null}
    </div>
  );
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  return resolveProjectColorValue(project);
}
