import { useNavigate } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AppButton,
  CheckboxFilterDropdown,
  DirectoryStatusFilter,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableCell,
  IconButton,
  PageLayout,
  RadioFilterDropdown,
  SelectDropdown,
} from "@opentoggl/web-ui";

import {
  ArchiveIcon,
  CloseIcon,
  EditIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
} from "../../shared/ui/icons.tsx";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";
import {
  useAddProjectGroupMutation,
  useArchiveProjectMutation,
  useClientsQuery,
  useCreateClientMutation,
  useCreateProjectMutation,
  useDeleteProjectGroupMutation,
  useDeleteProjectMutation,
  useGroupsQuery,
  usePinProjectMutation,
  useProjectGroupsQuery,
  useProjectsQuery,
  useRestoreProjectMutation,
  useUnpinProjectMutation,
  useUpdateProjectMutation,
  useWorkspaceUsersQuery,
} from "../../shared/query/web-shell.ts";
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceProjectUsers } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
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
import { useProjectForm } from "./useProjectForm.ts";
import { useProjectFilters, type ProjectCategory } from "./useProjectFilters.ts";

const PROJECT_STATUS_OPTIONS = (
  t: (key: string) => string,
): { label: string; value: ProjectCategory }[] => [
  { label: t("upcoming"), value: "upcoming" },
  { label: t("active"), value: "active" },
  { label: t("archived"), value: "archived" },
  { label: t("ended"), value: "ended" },
];

const PROJECT_COLUMNS = (t: (key: string) => string): DirectoryTableColumn[] => [
  { key: "project", label: t("project"), width: "minmax(160px,1fr)" },
  { key: "client", label: t("client"), width: "120px" },
  { key: "timeframe", label: t("timeframe"), width: "140px" },
  { key: "time-status", label: t("timeStatus"), width: "100px" },
  { key: "billable-status", label: t("billableStatus"), width: "120px" },
  { key: "team", label: t("team"), width: "140px" },
  { key: "pinned", label: t("pinned"), width: "64px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

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
  const { t } = useTranslation("projects");
  const navigate = useNavigate();
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [form, formDispatch] = useProjectForm();
  const [filters, filterDispatch] = useProjectFilters(statusFilter);
  const {
    editorMode,
    editorProject,
    name: projectName,
    color: projectColor,
    isPrivate: projectPrivate,
    template: projectTemplate,
    clientId: projectClientId,
    billable: projectBillable,
    startDate: projectStartDate,
    endDate: projectEndDate,
    recurring: projectRecurring,
    estimatedHours: projectEstimatedHours,
    fixedFee: projectFixedFee,
    error: projectEditorError,
  } = form;
  const {
    filterClientIds,
    filterMemberIds,
    filterBillable,
    filterName,
    filterTemplate,
    selectedStatuses,
  } = filters;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
  const deleteProjectMutation = useDeleteProjectMutation(workspaceId);
  const groupsQuery = useGroupsQuery(workspaceId);
  const projectGroupsQuery = useProjectGroupsQuery(workspaceId);
  const addProjectGroupMutation = useAddProjectGroupMutation(workspaceId);
  const deleteProjectGroupMutation = useDeleteProjectGroupMutation(workspaceId);
  const clientsQuery = useClientsQuery(workspaceId);
  const createClientMutation = useCreateClientMutation(workspaceId);
  // Fetch all project-user mappings for member filtering
  const projectUsersQuery = useQuery({
    queryKey: ["project-users-all", workspaceId],
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceProjectUsers({
          path: { workspace_id: workspaceId },
        }),
      ),
  });
  const projectUsersByProject = (() => {
    const map = new Map<number, Set<number>>();
    for (const pu of projectUsersQuery.data ?? []) {
      const pid = pu.project_id;
      const uid = pu.user_id;
      if (pid == null || uid == null) continue;
      const set = map.get(pid) ?? new Set();
      set.add(uid);
      map.set(pid, set);
    }
    return map;
  })();

  const workspaceGroups = (groupsQuery.data ?? []).filter(
    (g): g is { id: number; name: string } & typeof g => g.id != null && g.name != null,
  );
  const projectGroupsByProject = (() => {
    const map = new Map<number, { projectGroupId: number; groupId: number }>();
    for (const pg of projectGroupsQuery.data ?? []) {
      if (pg.pid != null && pg.group_id != null && pg.id != null) {
        map.set(pg.pid, { projectGroupId: pg.id, groupId: pg.group_id });
      }
    }
    return map;
  })();
  const teamOptions = [
    { label: t("everyone"), value: "everyone" },
    { label: t("private"), value: "private" },
    ...workspaceGroups.map((g) => ({ label: g.name, value: `group:${g.id}` })),
  ];

  const clientsList = (clientsQuery.data ?? [])
    .filter((c): c is { id: number; name: string } => c.id != null && c.name != null)
    .map((c) => ({ id: c.id, name: c.name }));
  const projects = (() => {
    const all = normalizeProjects(projectsQuery.data);
    return all.filter((p) => {
      if (!selectedStatuses.has(categorizeProject(p))) return false;
      if (filterClientIds.size > 0 && !filterClientIds.has(p.client_id ?? 0)) return false;
      if (filterMemberIds.size > 0 && p.id != null) {
        const projectMembers = projectUsersByProject.get(p.id);
        if (!projectMembers || ![...filterMemberIds].some((mid) => projectMembers.has(mid)))
          return false;
      }
      if (filterBillable === "billable" && !p.billable) return false;
      if (filterBillable === "non-billable" && p.billable) return false;
      if (filterTemplate === "template" && !p.template) return false;
      if (filterTemplate === "non-template" && p.template) return false;
      if (filterName.trim()) {
        const q = filterName.trim().toLowerCase();
        if (!(p.name ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  })();
  const workspaceMembers = (workspaceUsersQuery.data ?? [])
    .filter((member) => member.id != null && member.inactive !== true)
    .map((member) => ({
      email: member.email ?? undefined,
      id: member.id as number,
      name: member.fullname?.trim() || member.email?.trim() || `User ${member.id}`,
    }));
  const mutationPending =
    createProjectMutation.isPending ||
    updateProjectMutation.isPending ||
    archiveProjectMutation.isPending ||
    restoreProjectMutation.isPending ||
    pinProjectMutation.isPending ||
    unpinProjectMutation.isPending ||
    deleteProjectMutation.isPending ||
    createClientMutation.isPending;

  async function navigateToStatus(nextStatus: ProjectStatusFilter) {
    await navigate({
      params: { workspaceId: String(workspaceId) },
      search: { status: nextStatus },
      to: "/projects/$workspaceId/list",
    });
  }

  function openCreateDialog() {
    formDispatch({ type: "OPEN_CREATE" });
  }

  function openEditDialog(project: GithubComTogglTogglApiInternalModelsProject) {
    formDispatch({ type: "OPEN_EDIT", project });
  }

  function closeEditor() {
    formDispatch({ type: "CLOSE" });
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
      if (editorMode === "edit" && editorProject?.id != null) {
        await updateProjectMutation.mutateAsync({
          ...sharedFields,
          projectId: editorProject.id,
        });
      } else {
        await createProjectMutation.mutateAsync(sharedFields);
      }

      closeEditor();
      setStatusMessage(editorMode === "edit" ? t("projectUpdated") : t("projectCreated"));
      if (statusFilter === "archived") {
        await navigateToStatus("default");
      }
    } catch {
      formDispatch({ type: "SET_ERROR", error: "Project name already exists" });
    }
  }

  async function handlePinToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    if (project.pinned) {
      await unpinProjectMutation.mutateAsync(project.id);
      setStatusMessage(t("unpinProject", { name: project.name }));
      return;
    }

    await pinProjectMutation.mutateAsync(project.id);
    setStatusMessage(t("pinProject", { name: project.name }));
  }

  async function handleArchiveToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    if (project.active) {
      await archiveProjectMutation.mutateAsync(project.id);
      setStatusMessage(t("archiveProject", { name: project.name }));
      return;
    }

    await restoreProjectMutation.mutateAsync(project.id);
    setStatusMessage(t("restoreProject", { name: project.name }));
  }

  async function handleTemplateToggle(project: GithubComTogglTogglApiInternalModelsProject) {
    if (project.id == null) {
      return;
    }

    await updateProjectMutation.mutateAsync({
      color: resolveProjectColor(project),
      isPrivate: project.is_private === true,
      name: project.name ?? t("untitledProject"),
      projectId: project.id,
      template: project.template !== true,
    });
    setStatusMessage(
      project.template
        ? t("untemplateProject", { name: project.name })
        : t("templateProject", { name: project.name }),
    );
  }

  async function handleDelete(
    project: GithubComTogglTogglApiInternalModelsProject,
    mode: "unassign" | "reassign",
    reassignProjectId?: number,
  ) {
    if (project.id == null) return;

    await deleteProjectMutation.mutateAsync({
      projectId: project.id,
      teDeletionMode: "unassign",
      reassignTo: mode === "reassign" ? reassignProjectId : undefined,
    });
    setStatusMessage(t("deleteProject", { name: project.name }));
  }

  async function handleTeamChange(
    project: GithubComTogglTogglApiInternalModelsProject,
    value: string,
  ) {
    if (project.id == null) return;

    try {
      // Remove existing project-group association if any
      const existing = projectGroupsByProject.get(project.id);
      if (existing) {
        await deleteProjectGroupMutation.mutateAsync(existing.projectGroupId);
      }

      if (value === "everyone") {
        await updateProjectMutation.mutateAsync({
          color: resolveProjectColor(project),
          isPrivate: false,
          name: project.name ?? t("untitledProject"),
          projectId: project.id,
        });
        toast.success(t("teamUpdated", { name: project.name }));
      } else if (value === "private") {
        await updateProjectMutation.mutateAsync({
          color: resolveProjectColor(project),
          isPrivate: true,
          name: project.name ?? t("untitledProject"),
          projectId: project.id,
        });
        toast.success(t("teamUpdated", { name: project.name }));
      } else if (value.startsWith("group:")) {
        const groupId = Number(value.slice(6));
        await updateProjectMutation.mutateAsync({
          color: resolveProjectColor(project),
          isPrivate: true,
          name: project.name ?? t("untitledProject"),
          projectId: project.id,
        });
        await addProjectGroupMutation.mutateAsync({ projectId: project.id, groupId });
        const groupName = workspaceGroups.find((g) => g.id === groupId)?.name;
        toast.success(t("teamUpdatedToGroup", { name: project.name, group: groupName }));
      }
    } catch {
      toast.error(t("teamUpdateFailed"));
    }
  }

  const toolbarContent = (
    <div className="flex flex-wrap items-center gap-4" data-testid="projects-filter-bar">
      <DirectoryStatusFilter
        onChange={(statuses) => filterDispatch({ type: "SET_STATUSES", statuses })}
        options={PROJECT_STATUS_OPTIONS(t)}
        selected={selectedStatuses}
      />
      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
        <span>{t("filters")}</span>
        <CheckboxFilterDropdown
          label={t("client")}
          onClear={() => filterDispatch({ type: "CLEAR_CLIENT_IDS" })}
          onToggle={(id: number) => filterDispatch({ type: "TOGGLE_CLIENT_ID", id })}
          options={clientsList.map((c) => ({ key: c.id, label: c.name }))}
          selected={filterClientIds}
          testId="projects-filter-client"
        />
        <CheckboxFilterDropdown
          label={t("member")}
          onClear={() => filterDispatch({ type: "CLEAR_MEMBER_IDS" })}
          onToggle={(id: number) => filterDispatch({ type: "TOGGLE_MEMBER_ID", id })}
          options={workspaceMembers.map((m) => ({ key: m.id, label: m.name }))}
          selected={filterMemberIds}
          testId="projects-filter-member"
        />
        <RadioFilterDropdown
          label={t("billable")}
          onChange={(value) => filterDispatch({ type: "SET_BILLABLE", value })}
          options={[
            { key: "all" as const, label: t("all") },
            { key: "billable" as const, label: t("billable") },
            { key: "non-billable" as const, label: t("nonBillable") },
          ]}
          selected={filterBillable}
          testId="projects-filter-billable"
        />
        <RadioFilterDropdown
          label={t("template")}
          onChange={(value) => filterDispatch({ type: "SET_TEMPLATE", value })}
          options={[
            { key: "all" as const, label: t("all") },
            { key: "template" as const, label: t("template") },
            { key: "non-template" as const, label: t("nonTemplate") },
          ]}
          selected={filterTemplate}
          testId="projects-filter-template"
        />
        <div className="relative flex items-center">
          <input
            className="h-9 w-[160px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] normal-case tracking-normal text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
            data-testid="projects-filter-name"
            onChange={(e) => filterDispatch({ type: "SET_NAME", name: e.target.value })}
            placeholder={t("projectName")}
            type="text"
            value={filterName}
          />
          {filterName.trim() ? (
            <button
              className="absolute right-2 text-[var(--track-text-muted)] hover:text-white"
              onClick={() => filterDispatch({ type: "SET_NAME", name: "" })}
              type="button"
            >
              <CloseIcon className="size-3" />
            </button>
          ) : null}
        </div>
      </div>
      {statusMessage ? (
        <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{statusMessage}</span>
      ) : null}
    </div>
  );

  const bulkBar =
    selectedIds.size > 0 ? (
      <div className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5">
        <span className="text-[14px] font-medium text-white">
          {t("itemsSelected", { count: selectedIds.size })}
        </span>
        <span className="h-4 w-px bg-[var(--track-border)]" />
        <AppButton
          onClick={() => {
            if (selectedIds.size === 1) {
              const projectId = [...selectedIds][0];
              const project = projects.find((p) => p.id === projectId);
              if (project) openEditDialog(project);
            }
          }}
          size="sm"
        >
          <EditIcon className="size-3.5" />
          <span>{t("edit")}</span>
        </AppButton>
        <AppButton
          onClick={() => {
            for (const id of selectedIds) {
              void archiveProjectMutation.mutateAsync(id);
            }
            setSelectedIds(new Set());
            setStatusMessage(t("archiveProjectsConfirm", { count: selectedIds.size }));
          }}
          size="sm"
        >
          <ArchiveIcon className="size-3.5" />
          <span>{t("archive")}</span>
        </AppButton>
        <AppButton
          onClick={() => {
            if (!window.confirm(t("deleteProjectsConfirm", { count: selectedIds.size }))) return;
            for (const id of selectedIds) {
              void deleteProjectMutation.mutateAsync({ projectId: id, teDeletionMode: "unassign" });
            }
            setSelectedIds(new Set());
            setStatusMessage(t("deleteProjectsConfirm", { count: selectedIds.size }));
          }}
          size="sm"
        >
          <TrashIcon className="size-3.5" />
          <span>{t("delete")}</span>
        </AppButton>
        <IconButton
          aria-label={t("clearSelection")}
          onClick={() => setSelectedIds(new Set())}
          size="sm"
        >
          <CloseIcon className="size-3.5" />
        </IconButton>
      </div>
    ) : null;

  const summaryFooter =
    !projectsQuery.isPending && !projectsQuery.isError ? (
      <div
        className="flex items-center justify-between border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
        data-testid="projects-summary"
      >
        <span>{t("showingProjectsInWorkspace", { count: projects.length, workspaceId })}</span>
        <span>
          {t("pinnedCount", { count: projects.filter((project) => project.pinned).length })}
        </span>
      </div>
    ) : null;

  return (
    <>
      <PageLayout
        title={t("projects")}
        headerActions={
          <AppButton onClick={openCreateDialog} data-testid="projects-create-button">
            <PlusIcon className="size-3.5" />
            {t("newProject")}
          </AppButton>
        }
        toolbar={toolbarContent}
        bulkActionsBar={bulkBar}
        footer={summaryFooter}
        data-testid="projects-page"
      >
        {projectsQuery.isPending ? (
          <DirectorySurfaceMessage message={t("loadingProjects")} />
        ) : null}
        {projectsQuery.isError ? (
          <DirectorySurfaceMessage message={t("unableToLoadProjects")} tone="error" />
        ) : null}
        {!projectsQuery.isPending && !projectsQuery.isError ? (
          <DirectoryTable
            columns={PROJECT_COLUMNS(t)}
            rows={projects}
            rowKey={(p) => p.id!}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={(id) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleSelectAll={() =>
              setSelectedIds((prev) =>
                prev.size === projects.length ? new Set() : new Set(projects.map((p) => p.id!)),
              )
            }
            renderRow={(project) => (
              <>
                <div className="flex items-center gap-3 overflow-hidden">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    data-testid="project-color"
                    style={{ backgroundColor: resolveProjectColor(project) }}
                  />
                  <a
                    className="truncate font-medium"
                    data-testid="project-name"
                    href={buildProjectTeamPath(workspaceId, project.id ?? 0)}
                    style={{ color: resolveProjectColor(project) }}
                  >
                    {project.name ?? t("untitledProject")}
                  </a>
                </div>
                <DirectoryTableCell>{project.client_name ?? ""}</DirectoryTableCell>
                <DirectoryTableCell>
                  {project.current_period?.start_date ?? project.start_date ?? "-"}
                </DirectoryTableCell>
                <DirectoryTableCell>{formatProjectHours(project)}</DirectoryTableCell>
                <DirectoryTableCell>
                  {project.billable ? t("billable") : t("nonBillable")}
                </DirectoryTableCell>
                <DirectoryTableCell>
                  <SelectDropdown
                    aria-label={`${t("team")} ${project.name}`}
                    onChange={(value) => void handleTeamChange(project, value)}
                    options={teamOptions}
                    value={(() => {
                      const pg =
                        project.id != null ? projectGroupsByProject.get(project.id) : undefined;
                      if (pg) return `group:${pg.groupId}`;
                      return project.is_private ? "private" : "everyone";
                    })()}
                  />
                </DirectoryTableCell>
                <div className="flex items-center">
                  <IconButton
                    aria-label={`${project.pinned ? t("unpin") : t("pin")} ${project.name}`}
                    className={
                      project.pinned
                        ? "text-[var(--track-accent)]"
                        : "opacity-0 transition-opacity group-hover/row:opacity-100"
                    }
                    onClick={() => void handlePinToggle(project)}
                    size="md"
                  >
                    <PinIcon className="size-4" />
                  </IconButton>
                </div>
                <div className="flex items-center justify-end">
                  <ProjectRowActionsMenu
                    onAddMember={() => openEditDialog(project)}
                    onArchiveToggle={() => {
                      void handleArchiveToggle(project);
                    }}
                    onDelete={(mode, reassignProjectId) => {
                      void handleDelete(project, mode, reassignProjectId);
                    }}
                    onEdit={() => openEditDialog(project)}
                    onTemplateToggle={() => {
                      void handleTemplateToggle(project);
                    }}
                    project={project}
                    reassignTargets={projects
                      .filter((p) => p.id != null && p.id !== project.id && p.active !== false)
                      .map((p) => ({ id: p.id!, name: p.name ?? t("untitledProject") }))}
                    workspaceId={workspaceId}
                  />
                </div>
              </>
            )}
            emptyState={
              <p
                className="text-sm text-[var(--track-text-muted)]"
                data-testid="projects-empty-state"
              >
                {emptyProjectsStateTitle(statusFilter)}
              </p>
            }
            data-testid="projects-list"
            data-row-testid="project-row"
          />
        ) : null}
      </PageLayout>

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
          name={projectName}
          onBillableChange={(v) => formDispatch({ type: "SET_BILLABLE", value: v })}
          onClientChange={(v) => formDispatch({ type: "SET_CLIENT_ID", value: v })}
          onClose={() => {
            closeEditor();
            formDispatch({ type: "SET_ERROR", error: null });
          }}
          onColorChange={(v) => formDispatch({ type: "SET_COLOR", value: v })}
          onCreateClient={async (clientName) => {
            const client = await createClientMutation.mutateAsync(clientName);
            if (client?.id) formDispatch({ type: "SET_CLIENT_ID", value: client.id });
          }}
          onEndDateChange={(v) => formDispatch({ type: "SET_END_DATE", value: v })}
          onEstimatedHoursChange={(v) => formDispatch({ type: "SET_ESTIMATED_HOURS", value: v })}
          onFixedFeeChange={(v) => formDispatch({ type: "SET_FIXED_FEE", value: v })}
          onNameChange={(value) => {
            formDispatch({ type: "SET_NAME", value });
            formDispatch({ type: "SET_ERROR", error: null });
          }}
          onPrivacyChange={(v) => formDispatch({ type: "SET_PRIVATE", value: v })}
          onRecurringChange={(v) => formDispatch({ type: "SET_RECURRING", value: v })}
          onStartDateChange={(v) => formDispatch({ type: "SET_START_DATE", value: v })}
          onSubmit={() => {
            void handleSubmitProject();
          }}
          onTemplateChange={(v) => formDispatch({ type: "SET_TEMPLATE", value: v })}
          recurring={projectRecurring}
          startDate={projectStartDate}
          submitLabel={editorMode === "edit" ? t("save") : t("createProject")}
          template={projectTemplate}
          title={editorMode === "edit" ? t("editProject") : t("createNewProject")}
        />
      ) : null}
    </>
  );
}

function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  return resolveProjectColorValue(project);
}
