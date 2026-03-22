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
    <div className="min-h-dvh bg-[#17171a] px-3 py-3 text-slate-100 sm:px-4 sm:py-4" data-testid="app-shell">
      <div className="mx-auto grid w-full max-w-[1680px] gap-3 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/8 bg-[#101013] p-3" data-testid="app-shell-sidebar">
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-3" data-testid="workspace-identity-card">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {session.currentOrganization?.name ?? "Personal workspace"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {session.currentWorkspace.name}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-[#c792d1] text-sm font-semibold text-[#16161a]"
              >
                O
              </span>
            </div>

            <div data-testid="shell-hero" className="space-y-4">
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
              <WorkspaceBadge />
              <SessionBootstrapStatus />
            </div>

            <nav aria-label="Primary" className="space-y-4" data-testid="shell-primary-nav">
              {navigationItems.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h2 className="px-3 text-xs font-medium text-slate-500">{section.title}</h2>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        activeProps={{
                          className: "bg-[#4d2c52] text-white",
                        }}
                        className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/6 hover:text-white"
                        key={item.to}
                        to={item.to}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </nav>

            <div className="mt-auto rounded-xl border border-white/8 bg-white/4 p-3" data-testid="current-timer-card">
              <p className="text-xs font-medium text-slate-500">Current timer</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Running in {session.user.timezone}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {session.currentWorkspace.defaultCurrency ?? "USD"} workspace defaults
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-[#f3d37c]">1:49:21</p>
              </div>
              <button
                className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </aside>

        <main className="space-y-3" data-testid="app-shell-main">
          <AppPanel className="border-white/8 bg-[#1c1c20]" data-testid="workspace-summary-bar">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Current workspace
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {session.currentWorkspace.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
                <span className="rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                  {session.currentOrganization?.name ?? "Personal scope"}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                  Role {session.currentWorkspace.role ?? "member"}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                  {session.currentWorkspace.defaultCurrency ?? "USD"} defaults
                </span>
              </div>
            </div>
          </AppPanel>
          {children}
        </main>
      </div>
    </div>
  );
}
