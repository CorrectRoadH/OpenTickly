import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceOverviewPage(): ReactElement {
  const session = useSession();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <AppPanel className="bg-white/95">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Workspace Overview
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Review the active organization, workspace defaults, and current access scope before
              moving into reports, members, or settings.
            </p>
          </div>
          <dl className="grid gap-3 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/70 p-5 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium">Organization</dt>
              <dd>{session.currentOrganization?.name ?? "Personal"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium">Currency</dt>
              <dd>{session.currentWorkspace.defaultCurrency ?? "USD"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium">Role</dt>
              <dd>{session.currentWorkspace.role ?? "member"}</dd>
            </div>
          </dl>
        </div>
      </AppPanel>

      <AppPanel className="bg-slate-950 text-slate-50">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Workspace scope
          </p>
          <p className="text-sm leading-6 text-slate-200">
            Profile stays account-scoped, while organization and workspace management stay on their
            own routes under the current workspace context.
          </p>
        </div>
      </AppPanel>
    </div>
  );
}
