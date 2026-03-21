import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import { useClientsQuery, useCreateClientMutation } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type ClientStatusFilter = "active" | "all" | "inactive";

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
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading clients…</p>
      </AppPanel>
    );
  }

  if (clientsQuery.isError) {
    return (
      <AppPanel className="bg-white/95">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Clients</h1>
          <p className="text-sm leading-6 text-rose-700">
            Unable to load clients. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
  }

  const clients = clientsQuery.data?.clients ?? [];
  const filteredClients = clients.filter((client) => {
    if (statusFilter === "active") {
      return client.active;
    }

    if (statusFilter === "inactive") {
      return !client.active;
    }

    return true;
  });
  const activeCount = clients.filter((client) => client.active).length;
  const inactiveCount = clients.length - activeCount;
  const trimmedClientName = clientName.trim();

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedClientName.length === 0) {
      return;
    }

    await createClientMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: trimmedClientName,
    });
    setClientName("");
    setStatusFilter("all");
    setStatus("Client created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Clients</h1>
          <p className="text-sm leading-6 text-slate-600">Client directory</p>
        </div>
        <AppButton onClick={() => clientNameInputRef.current?.focus()} type="button">
          Create client
        </AppButton>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Client status filter
          <select
            aria-label="Client status filter"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ClientStatusFilter)}
          >
            <option value="all">All clients</option>
            <option value="active">Active clients</option>
            <option value="inactive">Inactive clients</option>
          </select>
        </label>
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleCreateClient}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Client name
          <input
            ref={clientNameInputRef}
            className="rounded-2xl border border-slate-300 px-4 py-3"
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
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      {filteredClients.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200" aria-label="Clients list">
          <li className="py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Workspace {session.currentWorkspace.id}
          </li>
          {filteredClients.map((client) => {
            const statusLabel = client.active ? "Active" : "Inactive";

            return (
              <li key={client.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                  <p className="text-xs text-slate-600">Client · {statusLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    aria-label={`Client details for ${client.name}`}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-800"
                    href={`/workspaces/${session.currentWorkspace.id}/clients/${client.id}`}
                  >
                    Client details
                  </a>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {statusLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
          <p className="text-sm font-semibold text-slate-900">{emptyStateTitle(statusFilter)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Switch filters or create a client to continue.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
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
