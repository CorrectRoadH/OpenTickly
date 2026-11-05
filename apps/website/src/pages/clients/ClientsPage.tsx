import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  IconButton,
  PageLayout,
} from "@opentickly/web-ui";

import { ClientsIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import {
  useArchiveClientMutation,
  useClientsQuery,
  useCreateClientMutation,
  useDeleteClientMutation,
  useProjectsQuery,
  useRenameClientMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { toast } from "sonner";
import { WebApiError } from "../../shared/api/web-client.ts";
import { useBulkAction } from "../../shared/query/useBulkAction.ts";
import { ClientsToolbar } from "./ClientsToolbar.tsx";
import { ClientsBulkBar } from "./ClientsBulkBar.tsx";
import { ClientDirectoryRow, ClientProjects } from "./ClientDirectoryRow.tsx";
import {
  type ClientStatusFilter,
  emptyStateTitle,
  isClientActive,
  normalizeClients,
  normalizeProjects,
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
  const bulk = useBulkAction(setSelectedIds, setStatusMessage);
  function report(operation: Promise<unknown>, success: string) {
    void operation
      .then(() => setStatusMessage(success))
      .catch((error: unknown) => {
        toast.error(error instanceof WebApiError ? error.userMessage : t("toast:failedToUpdate"));
      });
  }
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
    if (bulk.isPending) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }
  function onToggleSelectAll() {
    if (bulk.isPending) return;
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
            <ClientsBulkBar
              selectedIds={selectedIds}
              isPending={bulk.isPending}
              onRename={(id) => {
                const client = clients.find((item) => item.id === id);
                if (!client) return;
                const name = window.prompt(t("renameClient"), client.name)?.trim();
                if (name)
                  report(
                    renameClientMutation.mutateAsync({ clientId: id, name }),
                    t("clientRenamed"),
                  );
              }}
              onArchive={() =>
                void bulk.run(
                  [...selectedIds],
                  (id) => archiveClientMutation.mutateAsync(id),
                  t("clientArchived"),
                  t("toast:failedToUpdate"),
                )
              }
              onDelete={() =>
                void bulk.run(
                  [...selectedIds],
                  (id) => deleteClientMutation.mutateAsync(id),
                  t("clientDeleted"),
                  t("toast:failedToUpdate"),
                )
              }
              onClear={() => setSelectedIds(new Set())}
            />
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
          <ClientsToolbar
            selectedStatuses={selectedStatuses}
            onStatusesChange={setSelectedStatuses}
            search={search}
            onSearchChange={setSearch}
            statusMessage={statusMessage}
          />
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
            renderExpandedContent={(group) => (
              <ClientProjects group={group} workspaceId={workspaceId} />
            )}
            renderRow={(group) => (
              <ClientDirectoryRow
                group={group}
                onArchive={(id) =>
                  report(archiveClientMutation.mutateAsync(id), t("clientArchived"))
                }
                onDelete={(id) => report(deleteClientMutation.mutateAsync(id), t("clientDeleted"))}
                onRename={(id, name) =>
                  report(
                    renameClientMutation.mutateAsync({ clientId: id, name }),
                    t("clientRenamed"),
                  )
                }
              />
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
