import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useState } from "react";

import { useClientsQuery, useCreateClientMutation } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function ClientsPage(): ReactElement {
  const session = useSession();
  const clientsQuery = useClientsQuery(session.currentWorkspace.id);
  const createClientMutation = useCreateClientMutation(session.currentWorkspace.id);
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (clientsQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading clients…</p>
      </AppPanel>
    );
  }

  const clients = clientsQuery.data?.clients ?? [];
  const activeCount = clients.filter((client) => client.active).length;

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createClientMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: clientName,
    });
    setClientName("");
    setStatus("Client created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Clients</h1>
          <p className="text-sm leading-6 text-slate-600">Client directory</p>
        </div>
        <AppButton type="button">Create client</AppButton>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateClient}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Client name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </label>
        <AppButton type="submit">Save client</AppButton>
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Clients list">
        <li className="py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Workspace {session.currentWorkspace.id}
        </li>
        {clients.map((client) => {
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

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Showing {clients.length} clients in workspace {session.currentWorkspace.id}.
        </p>
        <p className="mt-1">Active: {activeCount}</p>
      </div>
    </AppPanel>
  );
}
