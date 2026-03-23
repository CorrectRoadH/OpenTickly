import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";

import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { shellNavigationItems } from "../shared/lib/shell-navigation.ts";
import { useCurrentTimeEntryQuery, useLogoutMutation } from "../shared/query/web-shell.ts";
import { swapWorkspaceInPath } from "../shared/lib/workspace-routing.ts";
import { useSession } from "../shared/session/session-context.tsx";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps): ReactElement {
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const logoutMutation = useLogoutMutation();
  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const session = useSession();
  const navigationItems = shellNavigationItems(session);
  const workspacePath = `/workspaces/${session.currentWorkspace.id}`;
  const onTrackingSurface = location.pathname === workspacePath;
  const runningEntry = currentTimeEntryQuery.data;
  const runningEntrySeconds =
    runningEntry && (runningEntry.workspace_id ?? runningEntry.wid) === session.currentWorkspace.id
      ? resolveTimeEntryDurationSeconds(runningEntry)
      : 0;
  const runningEntryLabel = formatClockDuration(runningEntrySeconds);

  return (
    <div className="min-h-dvh bg-[#191919] text-[#f4f1ec]" data-testid="app-shell">
      <div className="flex min-h-dvh">
        <aside
          className="flex w-[164px] shrink-0 border-r border-white/8 bg-[#0b0b0d]"
          data-testid="app-shell-sidebar"
        >
          <div className="flex w-9 flex-col items-center justify-between border-r border-white/8 bg-[#050506] py-3">
            <div className="space-y-3">
              <RailIcon accent />
              <RailIcon />
              <RailIcon />
              <RailIcon tiny />
            </div>
            <div className="space-y-3 text-center">
              <div className="space-y-1">
                <div className="mx-auto flex size-5 items-center justify-center rounded-full bg-[#f08c6c] text-[9px] font-semibold text-[#140d0a]">
                  P
                </div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Profile
                </p>
              </div>
              <RailIcon tiny />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col px-3 py-3">
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

            <nav aria-label="Primary" className="mt-5 space-y-5" data-testid="shell-primary-nav">
              {navigationItems.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {section.title}
                  </h2>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavItem
                        disabled={item.disabled}
                        key={`${section.title}-${item.label}`}
                        label={item.label}
                        pathname={location.pathname}
                        to={item.to}
                      />
                    ))}
                    {section.title === "Track" ? (
                      <Link
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                          onTrackingSurface
                            ? "bg-[#6f466f] text-white"
                            : "text-slate-300 hover:bg-white/6 hover:text-white"
                        }`}
                        search={{ view: "list" }}
                        to="/workspaces/$workspaceId"
                        params={{ workspaceId: String(session.currentWorkspace.id) }}
                      >
                        <span className="size-2 rounded-full bg-[#f0d3ff]" />
                        <span className="tabular-nums">{runningEntryLabel}</span>
                        <span className="ml-auto text-[11px] text-white/70">/</span>
                      </Link>
                    ) : null}
                  </div>
                </section>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              <div
                className="rounded-md border border-white/8 px-3 py-2.5"
                data-testid="current-timer-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    {session.currentWorkspace.defaultCurrency ?? "USD"}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[#f4d79c]">
                    {runningEntryLabel}
                  </span>
                </div>
              </div>
              <button
                className="w-full rounded-md border border-white/8 px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/6 hover:text-white disabled:opacity-60"
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
                {logoutMutation.isPending ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-auto" data-testid="app-shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  disabled = false,
  label,
  pathname,
  to,
}: {
  disabled?: boolean;
  label: string;
  pathname: string;
  to?: string;
}): ReactElement {
  const active = Boolean(to) && pathname === to;
  const className = `flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
    active ? "bg-[#2a2a2c] text-white" : "text-slate-300"
  } ${disabled ? "cursor-default opacity-55" : "hover:bg-white/6 hover:text-white"}`;

  if (!to || disabled) {
    return <span className={className}>{label}</span>;
  }

  if (to.includes("?")) {
    return (
      <a className={className} href={to}>
        {label}
      </a>
    );
  }

  return (
    <Link className={className} to={to}>
      {label}
    </Link>
  );
}

function RailIcon({
  accent = false,
  tiny = false,
}: {
  accent?: boolean;
  tiny?: boolean;
}): ReactElement {
  return (
    <div
      className={`flex items-center justify-center rounded-full border ${
        accent
          ? "border-[#c57ccc] bg-[#1f0d22] text-[#f2b7ff]"
          : "border-white/10 bg-[#121215] text-slate-500"
      } ${tiny ? "size-4" : "size-5"}`}
    >
      <div
        className={`rounded-full ${accent ? "bg-[#f2b7ff]" : "bg-current"} ${tiny ? "size-1.5" : "size-2"}`}
      />
    </div>
  );
}

function resolveTimeEntryDurationSeconds(entry: { duration?: number }): number {
  if (typeof entry.duration !== "number") {
    return 0;
  }

  if (entry.duration >= 0) {
    return entry.duration;
  }

  return Math.max(0, Math.floor(Date.now() / 1000) + entry.duration);
}

function formatClockDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}
