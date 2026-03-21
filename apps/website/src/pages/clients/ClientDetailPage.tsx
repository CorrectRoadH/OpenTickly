import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

type ClientDetailPageProps = {
  clientId: number;
  workspaceId: number;
};

export function ClientDetailPage({ clientId, workspaceId }: ClientDetailPageProps): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Client details</h1>
        <p className="text-sm leading-6 text-slate-600">
          Workspace {workspaceId} · Client {clientId}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-800"
          href={`/workspaces/${workspaceId}/clients`}
        >
          Back to clients
        </a>
      </div>
    </AppPanel>
  );
}
