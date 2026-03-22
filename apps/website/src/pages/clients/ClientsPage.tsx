import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import { useClientsQuery, useCreateClientMutation } from "../../shared/query/web-shell.ts";
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

function emptyStateTitle(statusFilter: ClientStatusFilter): string {
  if (statusFilter === "active") {
    return "No active clients match this view.";
  }

  if (statusFilter === "inactive") {
    return "No inactive clients match this view.";
  }

  return "No clients in this workspace yet.";
}

export function ClientsPage(): ReactElement {
  const session = useSession();
  const clientsQuery = useClientsQuery(session.currentWorkspace.id);
  const createClientMutation = useCreateClientMutation(session.currentWorkspace.id);
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const clientNameInputRef = useRef<HTMLInputElement | null>(null);

  if (clientsQuery.isPending) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <p className="text-sm text-slate-400">Loading clients…</p>
      </AppPanel>
    );
  }

  if (clientsQuery.isError) {
    return (
      <AppPanel className="border-rose-500/30 bg-[#23181b]">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Clients</h1>
          <p className="text-sm leading-6 text-rose-300">
            Unable to load clients. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
  }

  const clients = normalizeClients(clientsQuery.data);
  const filteredClients = clients.filter((client) => {
    if (statusFilter === "active") {
      return isClientActive(client);
    }

    if (statusFilter === "inactive") {
      return !isClientActive(client);
    }

    return true;
  });
  const activeCount = clients.filter(isClientActive).length;
  const inactiveCount = clients.length - activeCount;
  const trimmedClientName = clientName.trim();

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedClientName.length === 0) {
      return;
    }

    await createClientMutation.mutateAsync(trimmedClientName);
    setClientName("");
    setStatusFilter("all");
    setStatus("Client created");
  }

  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="clients-page">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Clients</h1>
          <p className="text-sm text-slate-500">Client directory</p>
          <p className="text-sm leading-6 text-slate-400">
            Keep project ownership, archived coverage, and tracked-time totals visible from the
            workspace client directory.
          </p>
        </div>
        <AppButton onClick={() => clientNameInputRef.current?.focus()} type="button">
          Create client
        </AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3" data-testid="clients-filter-bar">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-300">
          Client status filter
          <select
            aria-label="Client status filter"
            className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-sm text-white"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ClientStatusFilter)}
          >
            <option value="all">All clients</option>
            <option value="active">Active clients</option>
            <option value="inactive">Inactive clients</option>
          </select>
        </label>
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" data-testid="clients-create-form" onSubmit={handleCreateClient}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-300">
          Client name
          <input
            ref={clientNameInputRef}
            className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </label>
        <AppButton
          disabled={trimmedClientName.length === 0 || createClientMutation.isPending}
          type="submit"
        >
          Save client
        </AppButton>
        {status ? <p className="text-sm font-medium text-[#dface3]">{status}</p> : null}
      </form>

      {filteredClients.length > 0 ? (
        <ul className="mt-6 divide-y divide-white/8" aria-label="Clients list" data-testid="clients-list">
          <li className="py-2 text-[11px] font-medium uppercase text-slate-500">
            Workspace {session.currentWorkspace.id}
          </li>
          {filteredClients.map((client) => {
            const statusLabel = isClientActive(client) ? "Active" : "Inactive";
            const workspaceRef = client.wid ?? client.workspace_id ?? session.currentWorkspace.id;

            return (
              <li key={client.id} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">Client · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">Workspace {workspaceRef}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    aria-label={`Client details for ${client.name}`}
                    className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/8"
                    href={`/workspaces/${session.currentWorkspace.id}/clients/${client.id}`}
                  >
                    Client details
                  </a>
                  <span className="rounded-lg border border-white/10 bg-[#18181c] px-3 py-1 text-xs font-medium text-slate-300">
                    {statusLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-white/12 bg-[#18181c] px-5 py-6" data-testid="clients-empty-state">
          <p className="text-sm font-semibold text-white">{emptyStateTitle(statusFilter)}</p>
          <p className="mt-1 text-sm text-slate-400">
            Switch filters or create a client to continue.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-[#18181c] p-3 text-sm text-slate-300" data-testid="clients-summary">
        <p>
          Showing {clients.length} clients in workspace {session.currentWorkspace.id}.
        </p>
        <p className="mt-1">
          Active: {activeCount} · Inactive: {inactiveCount}
        </p>
      </div>
    </AppPanel>
  );
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

function hasClientArray(
  value: unknown,
  key: "clients" | "data",
): value is Record<typeof key, ClientListItem[]> {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key]);
}

function isClientActive(client: ClientListItem): boolean {
  if (typeof client.archived === "boolean") {
    return !client.archived;
  }

  return client.active !== false;
}
