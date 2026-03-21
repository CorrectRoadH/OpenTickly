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
          <p className="text-sm leading-6 text-slate-600">
            Transition state. This page keeps client records visible inside the workspace shell,
            but the documented client surface still needs its full filter set, batch actions, and
            dedicated detail flow.
          </p>
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
        {clients.map((client) => {
          const statusLabel = client.active ? "Active" : "Inactive";

          return (
            <li key={client.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                <p className="text-xs text-slate-600">Client · {statusLabel}</p>
                <p className="text-[11px] text-slate-500">Workspace {client.workspace_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Transition state. Showing {clients.length} client{clients.length === 1 ? "" : "s"} for
          workspace {session.currentWorkspace.id}, with {activeCount} active. Exit when the page
          matches the documented client management flow with filters, batch actions, and detail
          entry points covered by page-flow evidence.
        </p>
      </div>
    </AppPanel>
  );
}
