import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";

import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { TrackingIcon } from "../features/tracking/tracking-icons.tsx";
import { shellNavigationItems } from "../shared/lib/shell-navigation.ts";
import { swapWorkspaceInPath } from "../shared/lib/workspace-routing.ts";
import { useCurrentTimeEntryQuery, useLogoutMutation } from "../shared/query/web-shell.ts";
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
  const sections = shellNavigationItems(session);
  const adminSection = sections[sections.length - 1];
  const primarySections = sections.slice(0, -1);
  const workspacePath = `/workspaces/${session.currentWorkspace.id}`;
  const onTrackingSurface = location.pathname === workspacePath;
  const runningEntry = currentTimeEntryQuery.data;
  const runningEntrySeconds =
    runningEntry && (runningEntry.workspace_id ?? runningEntry.wid) === session.currentWorkspace.id
      ? resolveTimeEntryDurationSeconds(runningEntry)
      : 0;
  const profileInitial = (session.user.fullName || session.user.email || "P")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-[var(--track-canvas)] text-white" data-testid="app-shell">
      <div className="flex min-h-dvh">
        <aside className="flex w-[226px] shrink-0 border-r border-[var(--track-border)] bg-[var(--track-panel)]">
          <div className="flex w-[47px] flex-col items-center justify-between border-r border-[var(--track-border)] bg-black py-2">
            <div className="space-y-0.5">
              <RailButton active icon="track" />
              <RailButton icon="plan" />
              <RailButton icon="focus" />
            </div>
            <button
              aria-label="Navigation rail"
              className="flex h-10 w-full items-center justify-center text-[var(--track-text-muted)]"
              type="button"
            >
              <TrackingIcon className="h-4 w-[21px]" name="menu" />
            </button>
            <div className="space-y-1">
              <div className="flex flex-col items-center gap-1 py-1">
                <div className="flex size-[26px] items-center justify-center overflow-hidden rounded-full border border-[#1b1b1b] bg-[#d94182] text-[11px] font-semibold text-white">
                  {profileInitial}
                </div>
                <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  Profile
                </span>
              </div>
              <RailButton icon="bell" />
              <RailButton icon="help" />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-[var(--track-panel)]">
            <div className="px-1.5 pt-2">
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
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <nav
                aria-label="Primary"
                className="min-h-0 flex-1 overflow-y-auto px-0 pb-4 pt-6"
                data-testid="shell-primary-nav"
              >
                {primarySections.map((section) => (
                  <section key={section.title} className="mb-6">
                    <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                      {section.title}
                    </h2>
                    <div className="mt-2 space-y-0.5">
                      {section.items.map((item) => (
                        <ShellNavItem
                          active={isActivePath(location.pathname, item.to)}
                          badge={item.badge}
                          disabled={item.disabled}
                          key={`${section.title}-${item.label}`}
                          label={item.label}
                          to={item.to}
                        />
                      ))}
                      {section.title === "Track" ? (
                        <Link
                          className="block px-2"
                          params={{ workspaceId: String(session.currentWorkspace.id) }}
                          search={{ view: "list" }}
                          to="/workspaces/$workspaceId"
                        >
                          <div
                            data-testid="current-timer-card"
                            className={`flex h-7 items-center gap-3 rounded-md px-1.5 text-[14px] font-medium ${
                              onTrackingSurface
                                ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                                : "text-[var(--track-text-muted)] hover:bg-[var(--track-surface-raised)]"
                            }`}
                          >
                            <TrackingIcon className="h-4 w-[14px] shrink-0" name="timer" />
                            <span className="min-w-0 truncate tabular-nums">
                              {formatClockDuration(runningEntrySeconds)}
                            </span>
                            <span className="ml-auto flex size-4 items-center justify-center rounded text-current/80">
                              <TrackingIcon className="size-[14px]" name="edit" />
                            </span>
                          </div>
                        </Link>
                      ) : null}
                    </div>
                  </section>
                ))}
              </nav>

              {adminSection ? (
                <section className="border-t border-[var(--track-border)] px-0 pb-4 pt-3">
                  <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                    {adminSection.title}
                  </h2>
                  <div className="mt-2 space-y-0.5">
                    {adminSection.items.map((item) => (
                      <ShellNavItem
                        active={isActivePath(location.pathname, item.to)}
                        badge={item.badge}
                        disabled={item.disabled}
                        key={`${adminSection.title}-${item.label}`}
                        label={item.label}
                        to={item.to}
                      />
                    ))}
                  </div>
                  <div className="px-2 pt-3">
                    <button
                      className="flex h-9 w-full items-center justify-center rounded-md border border-[var(--track-border)] bg-[#111111] text-[13px] font-medium text-[var(--track-text-muted)] transition hover:bg-[#161616] hover:text-white disabled:opacity-60"
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
                </section>
              ) : null}
            </div>
          </div>
        </aside>

        <main
          className="min-w-0 flex-1 overflow-x-auto bg-[var(--track-surface)]"
          data-testid="app-shell-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function ShellNavItem({
  active,
  badge,
  disabled = false,
  label,
  to,
}: {
  active: boolean;
  badge?: string;
  disabled?: boolean;
  label: string;
  to?: string;
}): ReactElement {
  const content = (
    <div
      className={`flex h-7 items-center gap-3 rounded-md px-1.5 text-[14px] font-medium ${
        active
          ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
          : "text-[var(--track-text-muted)]"
      } ${disabled ? "opacity-55" : "hover:bg-[var(--track-surface-raised)] hover:text-white"}`}
    >
      <TrackingIcon className="h-4 w-[14px] shrink-0" name={navIconName(label)} />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-[8px] bg-[var(--track-border)] px-1.5 py-0.5 text-[12px] leading-none text-[#b2b2b2]">
          {badge}
        </span>
      ) : null}
    </div>
  );

  if (!to || disabled) {
    return <div className="px-2">{content}</div>;
  }

  return (
    <Link className="block px-2" to={to}>
      {content}
    </Link>
  );
}

function RailButton({
  active = false,
  icon,
}: {
  active?: boolean;
  icon: "bell" | "focus" | "help" | "plan" | "track";
}): ReactElement {
  return (
    <button
      aria-label={icon}
      className="flex h-10 w-full items-center justify-center"
      type="button"
    >
      <span
        className={`flex size-[26px] items-center justify-center rounded-full border ${
          active
            ? "border-transparent bg-[var(--track-accent)] text-black"
            : "border-[var(--track-border)] bg-[#1b1b1b] text-[var(--track-text-muted)]"
        }`}
      >
        <TrackingIcon className="size-4" name={icon} />
      </span>
    </button>
  );
}

function navIconName(label: string) {
  switch (label) {
    case "Overview":
      return "overview";
    case "Reports":
      return "reports";
    case "Approvals":
      return "approvals";
    case "Projects":
      return "projects";
    case "Clients":
      return "clients";
    case "Members":
      return "members";
    case "Invoices":
      return "invoices";
    case "Tags":
      return "tags";
    case "Goals":
      return "goals";
    case "Integrations":
      return "integrations";
    case "Subscription":
      return "subscription";
    case "Settings":
      return "settings";
    default:
      return "overview";
  }
}

function isActivePath(pathname: string, to?: string): boolean {
  if (!to) {
    return false;
  }

  return pathname === to || pathname.startsWith(`${to}/`);
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
