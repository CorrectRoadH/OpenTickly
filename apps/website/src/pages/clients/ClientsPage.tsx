import { type FormEvent, type ReactElement, useMemo, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useClientsQuery,
  useCreateClientMutation,
  useProjectsQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type ClientStatusFilter = "active" | "all" | "inactive";
type ClientListItem = {
  active?: boolean | null;
  archived?: boolean | null;
  id: number;
  name: string;
  wid?: number | null;
  workspace_id?: number | null;
};

export function ClientsPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const clientsQuery = useClientsQuery(workspaceId);
  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const createClientMutation = useCreateClientMutation(workspaceId);
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
    <div className="min-w-[1384px] bg-[var(--track-surface)] text-white" data-testid="clients-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex h-[66px] items-center justify-between px-5">
          <h1 className="text-[21px] font-medium text-white">Clients</h1>
          <button
            className="flex h-[28px] items-center gap-1 rounded-md bg-[var(--track-button)] px-3 text-[11px] font-medium text-black"
            data-testid="clients-create-button"
            onClick={() => setComposerOpen((value) => !value)}
            type="button"
          >
            <TrackingIcon className="size-3.5" name="plus" />
            New client
          </button>
        </div>
        <div
          className="flex h-[46px] items-center gap-3 border-t border-[var(--track-border)] px-5"
          data-testid="clients-filter-bar"
        >
          <label className="relative">
            <select
              aria-label="Client status filter"
              className="h-7 appearance-none rounded-md border border-[var(--track-border)] bg-[#171717] px-3 pr-8 text-[11px] text-white"
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
              className="h-7 w-[140px] rounded-md border border-[var(--track-border)] bg-[#171717] pl-8 pr-3 text-[11px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              value={search}
            />
          </label>
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
          data-testid="clients-create-form"
          onSubmit={handleCreateClient}
        >
          <label className="sr-only" htmlFor="client-name">
            Client name
          </label>
          <input
            className="h-9 w-[320px] rounded-md border border-[var(--track-border)] bg-[#181818] px-3 text-[13px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            id="client-name"
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Client name"
            value={clientName}
          />
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={createClientMutation.isPending || !clientName.trim()}
            type="submit"
          >
            Save client
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
          <div data-testid="clients-list">
            <div className="grid grid-cols-[34px_28px_minmax(0,1fr)_42px] border-b border-[var(--track-border)] px-5 text-[9px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
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
                      <span className="text-[10px] text-[var(--track-text-muted)]">
                        ({clientProjects.length})
                      </span>
                    </div>
                    <div className="flex h-[26px] items-center justify-end text-[var(--track-text-muted)]">
                      <TrackingIcon className="size-3.5" name="more" />
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
                              href={`/workspaces/${workspaceId}/projects/${project.id}`}
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
                ‹
              </button>
              <span className="flex size-5 items-center justify-center rounded-[4px] bg-[#171717] text-white">
                1
              </span>
              <button
                className="flex size-5 items-center justify-center rounded-[4px] border border-[var(--track-border)]"
                type="button"
              >
                ›
              </button>
            </div>
          </div>
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

function emptyStateTitle(statusFilter: ClientStatusFilter): string {
  if (statusFilter === "active") {
    return "No active clients match this view.";
  }

  if (statusFilter === "inactive") {
    return "No inactive clients match this view.";
  }

  return "No clients in this workspace yet.";
}

function normalizeClients(data: unknown): ClientListItem[] {
  if (Array.isArray(data)) {
    return data as ClientListItem[];
  }

  if (hasClientArray(data, "clients")) {
    return data.clients;
  }

  if (hasClientArray(data, "data")) {
    return data.data;
  }

  return [];
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

function hasClientArray(
  value: unknown,
  key: "clients" | "data",
): value is Record<typeof key, ClientListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
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

function isClientActive(client: ClientListItem): boolean {
  if (typeof client.archived === "boolean") {
    return !client.archived;
  }

  return client.active !== false;
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
