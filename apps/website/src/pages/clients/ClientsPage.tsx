import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AppButton,
  AppInput,
  DirectorySurfaceMessage,
  DirectoryStatusFilter,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableRenderCountBadge,
  IconButton,
  PageLayout,
} from "@opentickly/web-ui";

import {
  ArchiveIcon,
  ClientsIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "../../shared/ui/icons.tsx";
import {
  useArchiveClientMutation,
  useClientsQuery,
  useCreateClientMutation,
  useDeleteClientMutation,
  useProjectsQuery,
  useRenameClientMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildProjectTeamPath } from "../../shared/url-state/projects-location.ts";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { ClientRowActions } from "./ClientRowActions.tsx";
import {
  type ClientStatusFilter,
  emptyStateTitle,
  isClientActive,
  normalizeClients,
  normalizeProjects,
  resolveProjectColor,
} from "./clients-data.ts";

const columns: DirectoryTableColumn[] = [
  { key: "name", label: "Clients | Projects", width: "minmax(0,1fr)" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function ClientsPage(): ReactElement {
  const { t } = useTranslation("clients");
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const clientsQuery = useClientsQuery(workspaceId);
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const createClientMutation = useCreateClientMutation(workspaceId);
  const renameClientMutation = useRenameClientMutation(workspaceId);
  const deleteClientMutation = useDeleteClientMutation(workspaceId);
  const archiveClientMutation = useArchiveClientMutation(workspaceId);
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<"active" | "inactive">>(
    new Set(["active"]),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const clients = normalizeClients(clientsQuery.data);
  const projects = normalizeProjects(projectsQuery.data);
  const statusFilter: ClientStatusFilter =
    selectedStatuses.size === 2 ? "all" : selectedStatuses.has("inactive") ? "inactive" : "active";
  const visibleClients = clients.filter((client) => {
    if (statusFilter === "active" && !isClientActive(client)) {
      return false;
    }

    if (statusFilter === "inactive" && isClientActive(client)) {
      return false;
    }

    if (!search.trim()) {
      return true;
    }

    return client.name.toLowerCase().includes(search.trim().toLowerCase());
  });
  const groupedClients = visibleClients.map((client) => ({
    client,
    projects: projects.filter(
      (project) =>
        (project.client_id ?? project.cid) === client.id ||
        (!project.client_id && project.client_name?.trim() === client.name),
    ),
  }));

  const expandedIds = (() => {
    const all = new Set<number | string>(groupedClients.map((g) => g.client.id));
    for (const id of collapsedIds) all.delete(id);
    return all;
  })();

  async function handleCreateClient(name: string) {
    if (!name) {
      return;
    }

    await createClientMutation.mutateAsync(name);
    setComposerOpen(false);
    setStatusMessage(t("clientCreated"));
  }

  function toggleClient(clientId: number) {
    setCollapsedIds((current) =>
      current.includes(clientId)
        ? current.filter((value) => value !== clientId)
        : [...current, clientId],
    );
  }

  function onToggleSelect(clientId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function onToggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === groupedClients.length
        ? new Set()
        : new Set(groupedClients.map((g) => g.client.id)),
    );
  }

  const isLoading = clientsQuery.isPending || projectsQuery.isPending;
  const isError = clientsQuery.isError || projectsQuery.isError;
  const isReady = !isLoading && !isError;

  return (
    <>
      <PageLayout
        bulkActionsBar={
          selectedIds.size > 0 ? (
            <div className="flex items-center gap-4 border-b border-[var(--track-border)] px-6 py-2.5">
              <span className="text-[14px] font-medium text-white">
                {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <span className="h-4 w-px bg-[var(--track-border)]" />
              <AppButton
                onClick={() => {
                  const firstId = [...selectedIds][0];
                  if (firstId != null && selectedIds.size === 1) {
                    const client = groupedClients.find((g) => g.client.id === firstId);
                    if (client) {
                      const newName = window.prompt(t("renameClient"), client.client.name);
                      if (newName?.trim() && newName.trim() !== client.client.name) {
                        renameClientMutation.mutate(
                          { clientId: firstId, name: newName.trim() },
                          { onSuccess: () => setStatusMessage(t("clientRenamed")) },
                        );
                      }
                    }
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
                    archiveClientMutation.mutate(id);
                  }
                  setSelectedIds(new Set());
                  setStatusMessage(t("clientArchived"));
                }}
                size="sm"
              >
                <ArchiveIcon className="size-3.5" />
                <span>{t("archive")}</span>
              </AppButton>
              <AppButton
                onClick={() => {
                  if (!window.confirm(t("deleteClientsConfirm", { count: selectedIds.size })))
                    return;
                  for (const id of selectedIds) {
                    deleteClientMutation.mutate(id);
                  }
                  setSelectedIds(new Set());
                  setStatusMessage(t("clientDeleted"));
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
          ) : null
        }
        data-testid="clients-page"
        footer={
          isReady ? (
            <div
              className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
              data-testid="clients-summary"
            >
              {t("showingClientsInWorkspace", { count: groupedClients.length, workspaceId })}
            </div>
          ) : null
        }
        headerActions={
          <AppButton
            onClick={() => setComposerOpen((value) => !value)}
            data-testid="clients-create-button"
          >
            <PlusIcon className="size-3.5" />
            {t("newClient")}
          </AppButton>
        }
        title={t("clients")}
        toolbar={
          <div className="flex flex-wrap items-center gap-3" data-testid="clients-filter-bar">
            <DirectoryStatusFilter
              onChange={setSelectedStatuses}
              options={[
                { label: t("active"), value: "active" as const },
                { label: t("inactive"), value: "inactive" as const },
              ]}
              selected={selectedStatuses}
            />
            <AppInput
              className="w-[180px]"
              leadingIcon={<SearchIcon className="size-3.5" />}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchClients")}
              size="sm"
              value={search}
            />
            {statusMessage ? (
              <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">
                {statusMessage}
              </span>
            ) : null}
          </div>
        }
      >
        {isLoading ? <DirectorySurfaceMessage message={t("loadingClients")} /> : null}
        {isError ? (
          <DirectorySurfaceMessage message={t("unableToLoadClients")} tone="error" />
        ) : null}
        {isReady ? (
          <DirectoryTable
            columns={columns}
            data-testid="clients-list"
            emptyIcon={<ClientsIcon className="size-5" />}
            emptyTitle={emptyStateTitle(statusFilter)}
            emptyDescription={
              statusFilter === "all" && !search.trim() ? t("createFirstClientHint") : undefined
            }
            emptyAction={
              statusFilter === "all" && !search.trim() ? (
                <AppButton
                  onClick={() => setComposerOpen(true)}
                  data-testid="clients-empty-state-create"
                >
                  <PlusIcon className="size-3.5" />
                  {t("newClient")}
                </AppButton>
              ) : undefined
            }
            expandable
            expandedIds={expandedIds}
            onToggleExpand={(id) => toggleClient(id as number)}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            pagination={
              <div className="flex items-center justify-center gap-2 px-5 py-4 text-[11px] text-[var(--track-text-muted)]">
                <IconButton aria-label={t("previousPage")} size="sm">
                  &#x2039;
                </IconButton>
                <span className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--track-surface-muted)] text-white">
                  1
                </span>
                <IconButton aria-label={t("nextPage")} size="sm">
                  &#x203A;
                </IconButton>
              </div>
            }
            renderExpandedContent={(g) =>
              g.projects.map((project) => (
                <div
                  className="flex h-[44px] items-center gap-2"
                  key={`${g.client.id}-${project.id}`}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: resolveProjectColor(project) }}
                  />
                  <a
                    className="truncate"
                    href={buildProjectTeamPath(workspaceId, project.id ?? 0)}
                    style={{ color: resolveProjectColor(project) }}
                  >
                    {project.name ?? "Untitled project"}
                  </a>
                </div>
              ))
            }
            renderRow={(g) => (
              <>
                <div className="flex h-[44px] items-center gap-2">
                  <span className="truncate text-white">{g.client.name}</span>
                  <span className="text-[14px] text-[var(--track-text-muted)]">
                    ({g.projects.length})
                  </span>
                  <DirectoryTableRenderCountBadge />
                </div>
                <div className="flex h-[44px] items-center justify-end">
                  <ClientRowActions
                    clientId={g.client.id}
                    clientName={g.client.name}
                    onArchive={(id) => {
                      archiveClientMutation.mutate(id, {
                        onSuccess: () => setStatusMessage(t("clientArchived")),
                      });
                    }}
                    onDelete={(id) => {
                      deleteClientMutation.mutate(id, {
                        onSuccess: () => setStatusMessage(t("clientDeleted")),
                      });
                    }}
                    onRename={(id, name) => {
                      renameClientMutation.mutate(
                        { clientId: id, name },
                        { onSuccess: () => setStatusMessage(t("clientRenamed")) },
                      );
                    }}
                  />
                </div>
              </>
            )}
            rowKey={(g) => g.client.id}
            rows={groupedClients}
            isRowEqual={(a, b) =>
              a.client.id === b.client.id &&
              a.client.name === b.client.name &&
              a.client.archived === b.client.archived &&
              a.projects.length === b.projects.length &&
              a.projects.every((project, index) => project === b.projects[index])
            }
            selectable
            selectedIds={selectedIds}
          />
        ) : null}
      </PageLayout>

      {composerOpen ? (
        <CreateNameDialog
          isPending={createClientMutation.isPending}
          nameLabel={t("clientName")}
          namePlaceholder={t("clientName")}
          onClose={() => setComposerOpen(false)}
          onSubmit={(values) => {
            void handleCreateClient(values.name);
          }}
          submitLabel={t("createClient")}
          title={t("createNewClient")}
        />
      ) : null}
    </>
  );
}
