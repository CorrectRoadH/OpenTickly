import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement, type ReactNode } from "react";

import { WorkspaceBadge } from "../entities/workspace/WorkspaceBadge.tsx";
import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { shellNavigationItems } from "../shared/lib/shell-navigation.ts";
import { useLogoutMutation } from "../shared/query/web-shell.ts";
import { swapWorkspaceInPath } from "../shared/lib/workspace-routing.ts";
import { useSession } from "../shared/session/session-context.tsx";
import { SessionBootstrapStatus } from "./SessionBootstrapStatus.tsx";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps): ReactElement {
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const logoutMutation = useLogoutMutation();
  const session = useSession();
  const navigationItems = shellNavigationItems(session);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <AppPanel
            className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(231,244,235,0.92))]"
            data-testid="shell-hero"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Workspace shell
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Workspace access
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Switch between workspaces, open account surfaces, and enter workspace management
                  from the current session.
                </p>
              </div>
              <WorkspaceBadge />
            </div>
          </AppPanel>

          <AppPanel className="bg-white/95">
            <div className="space-y-5">
              <SessionBootstrapStatus />
              <WorkspaceSwitcher
                currentWorkspaceId={session.currentWorkspace.id}
                onChange={(workspaceId) => {
                  void navigate({
                    to: swapWorkspaceInPath(location.pathname, workspaceId, location.searchStr),
                  });
                }}
                workspaces={session.availableWorkspaces.map((workspace) => ({
                  id: workspace.id,
                  name: workspace.name,
                }))}
              />
              <nav aria-label="Primary" className="flex flex-col gap-2">
                {navigationItems.map((item) => (
                  <Link
                    activeProps={{
                      className:
                        "border-emerald-700 bg-emerald-700 text-white shadow-[0_10px_25px_rgba(22,50,39,0.15)]",
                    }}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-800"
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <button
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-rose-500 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={logoutMutation.isPending}
                onClick={() => {
                  void logoutMutation.mutateAsync().then(() =>
                    navigate({
                      to: "/login",
                    }),
                  );
                }}
                type="button"
              >
                {logoutMutation.isPending ? "Logging out…" : "Log out"}
              </button>
            </div>
          </AppPanel>
        </aside>

        <main className="space-y-4">
          <AppPanel className="bg-white/95">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Current workspace
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {session.currentWorkspace.name}
                </p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>{session.currentOrganization?.name ?? "Personal scope"}</p>
                <p>{session.currentWorkspace.defaultCurrency ?? "USD"} defaults</p>
              </div>
            </div>
          </AppPanel>
          {children}
        </main>
      </div>
    </div>
  );
}
