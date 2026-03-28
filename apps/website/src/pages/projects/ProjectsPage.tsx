import { useNavigate } from "@tanstack/react-router";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import {
  DirectoryFilterChip,
  DirectoryHeaderCell,
  DirectoryStatusFilter,
  DirectorySurfaceMessage,
  DirectoryTableCell,
} from "@opentoggl/web-ui";

import {
  ArchiveIcon,
  ChevronDownIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  ProjectsIcon,
  TrashIcon,
} from "../../shared/ui/icons.tsx";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  DEFAULT_PROJECT_COLOR,
  resolveProjectColorValue,
} from "../../shared/lib/project-colors.ts";
import {
  useAddProjectMemberMutation,
  useArchiveProjectMutation,
  useClientsQuery,
  useCreateClientMutation,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  usePinProjectMutation,
  useProjectMembersQuery,
  useProjectsQuery,
  useRestoreProjectMutation,
  useUnpinProjectMutation,
  useUpdateProjectMutation,
  useWorkspaceUsersQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  buildProjectTeamPath,
  type ProjectStatusFilter,
} from "../../shared/url-state/projects-location.ts";
import {
  emptyProjectsStateTitle,
  formatProjectHours,
  normalizeProjects,
} from "./projects-page-helpers.ts";
import { ProjectEditorDialog } from "./ProjectEditorDialog.tsx";
import { ProjectRowActionsMenu } from "./ProjectRowActionsMenu.tsx";

type ProjectCategory = "upcoming" | "active" | "archived" | "ended";

const PROJECT_STATUS_OPTIONS: { label: string; value: ProjectCategory }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
  { label: "Ended", value: "ended" },
];

const DEFAULT_SELECTED_STATUSES: Set<ProjectCategory> = new Set(["upcoming", "active", "ended"]);

function categorizeProject(project: GithubComTogglTogglApiInternalModelsProject): ProjectCategory {
  if (project.active === false) return "archived";
  const now = new Date().toISOString().slice(0, 10);
  if (project.start_date && project.start_date > now) return "upcoming";
  if (project.end_date && project.end_date < now) return "ended";
  return "active";
}

type ProjectsPageProps = {
  statusFilter: ProjectStatusFilter;
};

export function ProjectsPage({ statusFilter }: ProjectsPageProps): ReactElement {
  const navigate = useNavigate();
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editorProject, setEditorProject] =
    useState<GithubComTogglTogglApiInternalModelsProject | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [projectPrivate, setProjectPrivate] = useState(false);
  const [projectTemplate, setProjectTemplate] = useState(false);
  const [projectClientId, setProjectClientId] = useState<number | null>(null);
  const [projectBillable, setProjectBillable] = useState(false);
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [projectRecurring, setProjectRecurring] = useState(false);
  const [projectEstimatedHours, setProjectEstimatedHours] = useState(0);
  const [projectFixedFee, setProjectFixedFee] = useState(0);
  const [memberRole, setMemberRole] = useState<"manager" | "regular">("regular");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ProjectCategory>>(() => {
    if (statusFilter === "active") return new Set<ProjectCategory>(["active"]);
    if (statusFilter === "archived") return new Set<ProjectCategory>(["archived"]);
    return new Set(DEFAULT_SELECTED_STATUSES);
  });
  const [projectEditorError, setProjectEditorError] = useState<string | null>(null);
  const projectsQuery = useProjectsQuery(
    workspaceId,
    selectedStatuses.has("archived") ? "all" : "active",
  );
  const workspaceUsersQuery = useWorkspaceUsersQuery(workspaceId);
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const updateProjectMutation = useUpdateProjectMutation(workspaceId);
  const archiveProjectMutation = useArchiveProjectMutation(workspaceId);
  const restoreProjectMutation = useRestoreProjectMutation(workspaceId);
  const pinProjectMutation = usePinProjectMutation(workspaceId);
  const unpinProjectMutation = useUnpinProjectMutation(workspaceId);
  const addProjectMemberMutation = useAddProjectMemberMutation(workspaceId);
  const deleteProjectMutation = useDeleteProjectMutation(workspaceId);
  const clientsQuery = useClientsQuery(workspaceId);
  const createClientMutation = useCreateClientMutation(workspaceId);
  const projectMembersQuery = useProjectMembersQuery(workspaceId, editorProject?.id ?? 0);
  const clientsList = useMemo(
    () =>
      (clientsQuery.data ?? [])
        .filter((c): c is { id: number; name: string } => c.id != null && c.name != null)
        .map((c) => ({ id: c.id, name: c.name })),
    [clientsQuery.data],
  );
  const projects = useMemo(() => {
    const all = normalizeProjects(projectsQuery.data);
    return all.filter((p) => selectedStatuses.has(categorizeProject(p)));
  }, [projectsQuery.data, selectedStatuses]);
  const workspaceMembers = useMemo(
    () =>
      (workspaceUsersQuery.data ?? [])
        .filter((member) => member.id != null && member.inactive !== true)
        .map((member) => ({
          email: member.email ?? undefined,
          id: member.id as number,
          name: member.fullname?.trim() || member.email?.trim() || `User ${member.id}`,
        })),
    [workspaceUsersQuery.data],
  );
  const existingProjectMemberIds = useMemo(
    () =>
      Array.from(
        new Set(
          (projectMembersQuery.data ?? [])
            .map((member) => member.user_id)
            .filter((memberId): memberId is number => typeof memberId === "number"),
        ),
      ),
    [projectMembersQuery.data],
  );
  const mutationPending =
    createProjectMutation.isPending ||
    updateProjectMutation.isPending ||
    archiveProjectMutation.isPending ||
    restoreProjectMutation.isPending ||
    pinProjectMutation.isPending ||
    unpinProjectMutation.isPending ||
    addProjectMemberMutation.isPending ||
    deleteProjectMutation.isPending ||
    createClientMutation.isPending;

  useEffect(() => {
    if (editorMode !== "edit" || !editorProject?.id) {
      return;
    }
    setSelectedMemberIds(existingProjectMemberIds);
  }, [editorMode, editorProject?.id, existingProjectMemberIds]);

  async function navigateToStatus(nextStatus: ProjectStatusFilter) {
    await navigate({
      params: { workspaceId: String(workspaceId) },
      search: { status: nextStatus },
      to: "/projects/$workspaceId/list",
    });
  }

  function openCreateDialog() {
    setEditorMode("create");
    setEditorProject(null);
    setProjectName("");
    setProjectColor(DEFAULT_PROJECT_COLOR);
    setProjectPrivate(false);
    setProjectTemplate(false);
    setProjectClientId(null);
    setProjectBillable(false);
    setProjectStartDate("");
    setProjectEndDate("");
    setProjectRecurring(false);
    setProjectEstimatedHours(0);
    setProjectFixedFee(0);
    setMemberRole("regular");
    setSelectedMemberIds([]);
    setProjectEditorError(null);
  }

  function openEditDialog(project: GithubComTogglTogglApiInternalModelsProject) {
    setEditorMode("edit");
    setEditorProject(project);
    setProjectName(project.name ?? "");
    setProjectColor(resolveProjectColor(project));
    setProjectPrivate(project.is_private === true);
    setProjectTemplate(project.template === true);
    setProjectClientId(project.client_id ?? null);
    setProjectBillable(project.billable === true);
    setProjectStartDate(project.start_date ?? "");
    setProjectEndDate(project.end_date ?? "");
    setProjectRecurring(project.recurring === true);
    setProjectEstimatedHours(project.estimated_hours ?? 0);
    setProjectFixedFee(project.fixed_fee ?? 0);
    setMemberRole("regular");
  }

  function closeEditor() {
    setEditorMode(null);
    setEditorProject(null);
  }

  async function handleSubmitProject() {
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      const sharedFields = {
        billable: projectBillable,
        clientId: projectClientId ?? undefined,
        color: projectColor,
        endDate: projectEndDate || undefined,
        estimatedHours: projectEstimatedHours || undefined,
        fixedFee: projectFixedFee || undefined,
        isPrivate: projectPrivate,
        name: trimmedName,
        recurring: projectRecurring,
        startDate: projectStartDate || undefined,
        template: projectTemplate,
      };
      const project =
        editorMode === "edit" && editorProject?.id != null
          ? await updateProjectMutation.mutateAsync({
              ...sharedFields,
              projectId: editorProject.id,
            })
          : await createProjectMutation.mutateAsync(sharedFields);

      const projectId = project.id ?? editorProject?.id;
      if (projectId != null) {
        const pendingMemberIds = selectedMemberIds.filter(
          (memberId) => !existingProjectMemberIds.includes(memberId),
        );
        for (const memberId of pendingMemberIds) {
          await addProjectMemberMutation.mutateAsync({
            isManager: memberRole === "manager",
            projectId,
            userId: memberId,
          });
        }
      }

      closeEditor();
      setStatusMessage(editorMode === "edit" ? "Project updated" : "Project created");
      if (statusFilter !== "all") {
        await navigateToStatus("all");
      }
    } catch {
      setProjectEditorError("Project name already exists");
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

  async function handleTemplateToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    await updateProjectMutation.mutateAsync({
      color: resolveProjectColor(project),
      isPrivate: project.is_private === true,
      name: project.name ?? "Untitled project",
      projectId: project.id,
      template: project.template !== true,
    });
    setStatusMessage(
      project.template ? `Removed template ${project.name}` : `Templated ${project.name}`,
    );
  }

  async function handleDelete(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null || !window.confirm(`Delete ${project.name}?`)) {
      return;
    }

    await deleteProjectMutation.mutateAsync(project.id);
    setStatusMessage(`Deleted ${project.name}`);
  }

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="projects-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Projects</h1>
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
            data-testid="projects-create-button"
            onClick={openCreateDialog}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            New project
          </button>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2"
          data-testid="projects-filter-bar"
        >
          <DirectoryStatusFilter
            chevronIcon={<ChevronDownIcon className="size-3" />}
            onChange={setSelectedStatuses}
            options={PROJECT_STATUS_OPTIONS}
            selected={selectedStatuses}
          />
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <span>Filters:</span>
            <DirectoryFilterChip label="Client" />
            <DirectoryFilterChip label="Member" />
            <DirectoryFilterChip label="Billable" />
            <DirectoryFilterChip label="Project name" />
            <DirectoryFilterChip disabled label="Template" />
          </div>
          {statusMessage ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </header>

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5">
          <span className="text-[13px] font-medium text-white">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <span className="h-4 w-px bg-[var(--track-border)]" />
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              if (selectedIds.size === 1) {
                const projectId = [...selectedIds][0];
                const project = projects.find((p) => p.id === projectId);
                if (project) openEditDialog(project);
              }
            }}
            type="button"
          >
            <EditIcon className="size-3.5" />
            <span>Edit</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              for (const id of selectedIds) {
                void archiveProjectMutation.mutateAsync(id);
              }
              setSelectedIds(new Set());
              setStatusMessage(`${selectedIds.size} project(s) archived`);
            }}
            type="button"
          >
            <ArchiveIcon className="size-3.5" />
            <span>Archive</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              if (!window.confirm(`Delete ${selectedIds.size} project(s)?`)) return;
              for (const id of selectedIds) {
                void deleteProjectMutation.mutateAsync(id);
              }
              setSelectedIds(new Set());
              setStatusMessage(`${selectedIds.size} project(s) deleted`);
            }}
            type="button"
          >
            <TrashIcon className="size-3.5" />
            <span>Delete</span>
          </button>
          <button
            aria-label="Clear selection"
            className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={() => setSelectedIds(new Set())}
            type="button"
          >
            <CloseIcon className="size-3.5" />
          </button>
        </div>
      ) : null}

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
            <div className="grid grid-cols-[42px_minmax(240px,1.8fr)_98px_130px_94px_110px_94px_56px_42px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              <DirectoryHeaderCell>
                <input
                  aria-label="Select all projects"
                  checked={projects.length > 0 && selectedIds.size === projects.length}
                  className="size-[14px] cursor-pointer appearance-none rounded-[3px] border border-[var(--track-border)] bg-transparent checked:border-[var(--track-accent)] checked:bg-[var(--track-accent)]"
                  onChange={() =>
                    setSelectedIds((prev) =>
                      prev.size === projects.length
                        ? new Set()
                        : new Set(projects.map((p) => p.id!)),
                    )
                  }
                  ref={(el) => {
                    if (el)
                      el.indeterminate = selectedIds.size > 0 && selectedIds.size < projects.length;
                  }}
                  type="checkbox"
                />
              </DirectoryHeaderCell>
              <DirectoryHeaderCell>Project</DirectoryHeaderCell>
              <DirectoryHeaderCell>Client</DirectoryHeaderCell>
              <DirectoryHeaderCell>Timeframe</DirectoryHeaderCell>
              <DirectoryHeaderCell>Time status</DirectoryHeaderCell>
              <DirectoryHeaderCell>Billable status</DirectoryHeaderCell>
              <DirectoryHeaderCell>Team</DirectoryHeaderCell>
              <DirectoryHeaderCell>Pinned</DirectoryHeaderCell>
              <DirectoryHeaderCell />
            </div>
            {projects.map((project) => (
              <div
                className="grid grid-cols-[42px_minmax(240px,1.8fr)_98px_130px_94px_110px_94px_56px_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
                key={project.id}
              >
                <div className="flex h-[54px] items-center">
                  <input
                    aria-label={`Select ${project.name}`}
                    checked={selectedIds.has(project.id!)}
                    className="size-[14px] cursor-pointer appearance-none rounded-[3px] border border-[var(--track-border)] bg-transparent checked:border-[var(--track-accent)] checked:bg-[var(--track-accent)]"
                    onChange={() =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(project.id!)) next.delete(project.id!);
                        else next.add(project.id!);
                        return next;
                      })
                    }
                    type="checkbox"
                  />
                </div>
                <div className="flex h-[54px] items-center gap-3 overflow-hidden">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: resolveProjectColor(project) }}
                  />
                  <a
                    className="truncate font-medium"
                    href={buildProjectTeamPath(workspaceId, project.id ?? 0)}
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
                  {project.billable ? "Billable" : "Non-billable"}
                </DirectoryTableCell>
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
                    <ProjectsIcon className="size-4" />
                  </button>
                </div>
                <div className="flex h-[54px] items-center justify-end">
                  <ProjectRowActionsMenu
                    onAddMember={() => openEditDialog(project)}
                    onArchiveToggle={() => {
                      void handleArchiveToggle(project);
                    }}
                    onDelete={() => {
                      void handleDelete(project);
                    }}
                    onEdit={() => openEditDialog(project)}
                    onTemplateToggle={() => {
                      void handleTemplateToggle(project);
                    }}
                    project={project}
                    workspaceId={workspaceId}
                  />
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

      {editorMode ? (
        <ProjectEditorDialog
          billable={projectBillable}
          clientId={projectClientId}
          clients={clientsList}
          color={projectColor}
          endDate={projectEndDate}
          error={projectEditorError}
          estimatedHours={projectEstimatedHours}
          fixedFee={projectFixedFee}
          isPending={mutationPending}
          isPrivate={projectPrivate}
          memberRole={memberRole}
          members={workspaceMembers}
          name={projectName}
          onBillableChange={setProjectBillable}
          onClientChange={setProjectClientId}
          onClose={() => {
            closeEditor();
            setProjectEditorError(null);
          }}
          onColorChange={setProjectColor}
          onCreateClient={async (clientName) => {
            const client = await createClientMutation.mutateAsync(clientName);
            if (client?.id) setProjectClientId(client.id);
          }}
          onEndDateChange={setProjectEndDate}
          onEstimatedHoursChange={setProjectEstimatedHours}
          onFixedFeeChange={setProjectFixedFee}
          onMemberRoleChange={setMemberRole}
          onNameChange={(value) => {
            setProjectName(value);
            setProjectEditorError(null);
          }}
          onPrivacyChange={setProjectPrivate}
          onRecurringChange={setProjectRecurring}
          onStartDateChange={setProjectStartDate}
          onSubmit={() => {
            void handleSubmitProject();
          }}
          onTemplateChange={setProjectTemplate}
          onToggleMember={(memberId) =>
            setSelectedMemberIds((current) =>
              current.includes(memberId)
                ? current.filter((id) => id !== memberId)
                : [...current, memberId],
            )
          }
          recurring={projectRecurring}
          selectedMemberIds={selectedMemberIds}
          startDate={projectStartDate}
          submitLabel={editorMode === "edit" ? "Save" : "Create project"}
          template={projectTemplate}
          title={editorMode === "edit" ? "Edit Project" : "Create new project"}
        />
      ) : null}
    </div>
  );
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  return resolveProjectColorValue(project);
}
