import { type FormEvent, type ReactElement, useMemo, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useClientsQuery,
  useCreateClientMutation,
  useDeleteClientMutation,
  useProjectsQuery,
  useRenameClientMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { buildProjectTeamPath } from "../../shared/url-state/projects-location.ts";
import { ClientRowActions } from "./ClientRowActions.tsx";
import {
  type ClientListItem,
  type ClientStatusFilter,
  emptyStateTitle,
  isClientActive,
  normalizeClients,
  normalizeProjects,
  resolveProjectColor,
} from "./clients-data.ts";

type GroupedClient = {
  client: ClientListItem;
  projects: GithubComTogglTogglApiInternalModelsProject[];
};

export function ClientsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const clientsQuery = useClientsQuery(workspaceId);
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const createClientMutation = useCreateClientMutation(workspaceId);
  const renameClientMutation = useRenameClientMutation(workspaceId);
  const deleteClientMutation = useDeleteClientMutation(workspaceId);
  const [clientName, setClientName] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("active");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<number[]>([]);
  const clients = useMemo(() => normalizeClients(clientsQuery.data), [clientsQuery.data]);
  const projects = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
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

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = clientName.trim();
    if (!trimmedName) {
      return;
    }

    await createClientMutation.mutateAsync(trimmedName);
    setClientName("");
    setComposerOpen(false);
    setStatusMessage("Client created");
  }

  function toggleClient(clientId: number) {
    setCollapsedIds((current) =>
      current.includes(clientId)
        ? current.filter((value) => value !== clientId)
        : [...current, clientId],
    );
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="clients-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Clients</h1>
          <button
            className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
            data-testid="clients-create-button"
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New client
          </button>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-3 border-t border-[var(--track-border)] px-5 py-2"
          data-testid="clients-filter-bar"
        >
          <label className="relative">
            <select
              aria-label="Client status filter"
              className="h-9 appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[12px] text-white"
              onChange={(event) => setStatusFilter(event.target.value as ClientStatusFilter)}
              value={statusFilter}
            >
              <option value="active">Show active</option>
              <option value="all">Show all</option>
              <option value="inactive">Show inactive</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <TrackingIcon className="size-3" name="chevron-down" />
            </span>
          </label>
          <label className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--track-text-muted)]">
              <TrackingIcon className="size-3.5" name="search" />
            </span>
            <input
              className="h-9 w-[180px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-8 pr-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              value={search}
            />
          </label>
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
          data-testid="clients-create-form"
          onSubmit={handleCreateClient}
        >
          <label className="sr-only" htmlFor="client-name">
            Client name
          </label>
          <input
            className="h-9 w-[320px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            id="client-name"
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Client name"
            value={clientName}
          />
          <button
            className="flex h-9 items-center rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black disabled:opacity-60"
            disabled={createClientMutation.isPending || !clientName.trim()}
            type="submit"
          >
            Save client
          </button>
          <button
            className="flex h-9 items-center rounded-[8px] border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={() => setComposerOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {clientsQuery.isPending || projectsQuery.isPending ? (
        <SurfaceMessage message="Loading clients..." />
      ) : null}
      {clientsQuery.isError || projectsQuery.isError ? (
        <SurfaceMessage message="Unable to load clients. Refresh to try again." tone="error" />
      ) : null}
      {!clientsQuery.isPending &&
      !projectsQuery.isPending &&
      !clientsQuery.isError &&
      !projectsQuery.isError ? (
        groupedClients.length > 0 ? (
          <ClientListTable
            collapsedIds={collapsedIds}
            deleteClientMutation={deleteClientMutation}
            groupedClients={groupedClients}
            renameClientMutation={renameClientMutation}
            setStatusMessage={setStatusMessage}
            toggleClient={toggleClient}
            workspaceId={workspaceId}
          />
        ) : (
          <div className="px-5 py-10">
            <p className="text-sm text-[var(--track-text-muted)]">
              {emptyStateTitle(statusFilter)}
            </p>
          </div>
        )
      ) : null}

      {!clientsQuery.isPending &&
      !projectsQuery.isPending &&
      !clientsQuery.isError &&
      !projectsQuery.isError ? (
        <div
          className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
          data-testid="clients-summary"
        >
          Showing {groupedClients.length} clients in workspace {workspaceId}.
        </div>
      ) : null}
    </div>
  );
}

function ClientListTable({
  collapsedIds,
  deleteClientMutation,
  groupedClients,
  renameClientMutation,
  setStatusMessage,
  toggleClient,
  workspaceId,
}: {
  collapsedIds: number[];
  deleteClientMutation: ReturnType<typeof useDeleteClientMutation>;
  groupedClients: GroupedClient[];
  renameClientMutation: ReturnType<typeof useRenameClientMutation>;
  setStatusMessage: (msg: string) => void;
  toggleClient: (id: number) => void;
  workspaceId: number;
}): ReactElement {
  return (
    <div data-testid="clients-list">
      <div className="grid grid-cols-[34px_28px_minmax(0,1fr)_42px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
        <div className="flex h-[28px] items-center">
          <span className="size-[10px] rounded-[3px] border border-[var(--track-border)]" />
        </div>
        <div className="flex h-[28px] items-center" />
        <div className="flex h-[28px] items-center">Clients | Projects</div>
        <div className="flex h-[28px] items-center justify-end" />
      </div>
      {groupedClients.map(({ client, projects: clientProjects }) => {
        const collapsed = collapsedIds.includes(client.id);
        return (
          <div key={client.id}>
            <div className="grid grid-cols-[34px_28px_minmax(0,1fr)_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]">
              <div className="h-[26px]" />
              <div className="flex h-[26px] items-center">
                <button
                  aria-label={`${collapsed ? "Expand" : "Collapse"} ${client.name}`}
                  className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() => toggleClient(client.id)}
                  type="button"
                >
                  <TrackingIcon
                    className="size-3"
                    name={collapsed ? "chevron-right" : "chevron-down"}
                  />
                </button>
              </div>
              <div className="flex h-[26px] items-center gap-2">
                <span className="truncate text-white">{client.name}</span>
                <span className="text-[12px] text-[var(--track-text-muted)]">
                  ({clientProjects.length})
                </span>
              </div>
              <div className="flex h-[26px] items-center justify-end">
                <ClientRowActions
                  clientId={client.id}
                  clientName={client.name}
                  onDelete={(id) => {
                    deleteClientMutation.mutate(id, {
                      onSuccess: () => setStatusMessage("Client deleted"),
                    });
                  }}
                  onRename={(id, name) => {
                    renameClientMutation.mutate(
                      { clientId: id, name },
                      { onSuccess: () => setStatusMessage("Client renamed") },
                    );
                  }}
                />
              </div>
            </div>
            {!collapsed
              ? clientProjects.map((project) => (
                  <div
                    className="grid grid-cols-[34px_28px_minmax(0,1fr)_42px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
                    key={`${client.id}-${project.id}`}
                  >
                    <div className="h-[26px]" />
                    <div className="h-[26px]" />
                    <div className="flex h-[26px] items-center gap-2 pl-6">
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
                    <div className="h-[26px]" />
                  </div>
                ))
              : null}
          </div>
        );
      })}
      <div className="flex items-center justify-center gap-2 px-5 py-4 text-[11px] text-[var(--track-text-muted)]">
        <button
          className="flex size-5 items-center justify-center rounded-[4px] border border-[var(--track-border)]"
          type="button"
        >
          &#x2039;
        </button>
        <span className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--track-surface-muted)] text-white">
          1
        </span>
        <button
          className="flex size-5 items-center justify-center rounded-[4px] border border-[var(--track-border)]"
          type="button"
        >
          &#x203A;
        </button>
      </div>
    </div>
  );
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
