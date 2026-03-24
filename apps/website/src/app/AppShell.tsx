import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  isOverviewNavActive,
  isSectionNavActive,
  isTimerNavActive,
} from "./shell-navigation-state.ts";
import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { TrackingIcon } from "../features/tracking/tracking-icons.tsx";
import {
  formatClockDuration,
  resolveEntryDurationSeconds,
} from "../features/tracking/overview-data.ts";
import { shellNavigationItems } from "../shared/lib/shell-navigation.ts";
import { UserAvatar } from "../shared/ui/UserAvatar.tsx";
import {
  buildOrganizationSettingsPath,
  swapWorkspaceInPath,
} from "../shared/lib/workspace-routing.ts";
import {
  useCurrentTimeEntryQuery,
  useProfileQuery,
  useUpdateProfileMutation,
  useUpdateWebSessionMutation,
} from "../shared/query/web-shell.ts";
import { useSession, useSessionActions } from "../shared/session/session-context.tsx";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps): ReactElement {
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const profileQuery = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();
  const sections = shellNavigationItems(session);
  const adminSection = sections[sections.length - 1];
  const primarySections = sections.slice(0, -1);
  const isTimerRoute = location.pathname === "/timer";
  const profileName = session.user.fullName || session.user.email || "Profile";

  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!runningEntry) {
      return;
    }
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningEntry]);

  const timerBadge = useMemo(() => {
    if (!runningEntry) {
      return undefined;
    }
    const seconds = resolveEntryDurationSeconds(runningEntry, nowMs);
    return formatClockDuration(seconds);
  }, [runningEntry, nowMs]);

  return (
    <div
      className="h-dvh overflow-hidden bg-[var(--track-surface)] text-[var(--track-text)]"
      data-testid="app-shell"
    >
      <div className="flex h-full">
        <aside className="flex h-full w-[226px] shrink-0 overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)]">
          <div className="flex w-[47px] flex-col items-center justify-between border-r border-[var(--track-border)] bg-black py-2">
            <div className="space-y-0.5">
              <RailButton active icon="track" />
              <RailButton icon="plan" />
              <RailButton icon="focus" />
            </div>
            <button
              aria-label="Navigation rail"
              className="flex h-[34px] w-full items-center justify-center text-[var(--track-text-muted)]"
              type="button"
            >
              <TrackingIcon className="h-4 w-[21px]" name="menu" />
            </button>
            <div className="space-y-1">
              <Link
                aria-label="Profile"
                className="flex flex-col items-center gap-1 py-1 text-[var(--track-text-muted)] transition hover:text-white"
                to="/profile"
              >
                <UserAvatar
                  className="size-[26px] overflow-hidden border border-[var(--track-surface)]"
                  imageUrl={session.user.imageUrl}
                  name={profileName}
                  textClassName="text-[11px] font-semibold"
                />
                <span className="text-[8px] font-medium uppercase tracking-[0.08em]">Profile</span>
              </Link>
              <RailButton icon="bell" />
              <RailButton icon="help" />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-[var(--track-panel)]">
            <div className="overflow-x-clip overflow-y-auto px-[6px] pt-2">
              <WorkspaceSwitcher
                currentOrganization={session.currentOrganization}
                inviteMembersPath={`/workspaces/${session.currentWorkspace.id}/members`}
                managePath={
                  session.currentOrganization
                    ? buildOrganizationSettingsPath(session.currentOrganization.id)
                    : undefined
                }
                onChange={(workspaceId) => {
                  if (isAccountScopedShellPath(location.pathname)) {
                    const previousWorkspaceId = session.currentWorkspace.id;
                    setCurrentWorkspaceId(workspaceId);
                    void updateWebSessionMutation
                      .mutateAsync({ workspace_id: workspaceId })
                      .catch(() => {
                        setCurrentWorkspaceId(previousWorkspaceId);
                      });
                    return;
                  }

                  void navigate({
                    to: swapWorkspaceInPath(location.pathname, workspaceId, location.searchStr),
                  });
                }}
                onSetDefault={(workspaceId) => {
                  return updateProfileMutation.mutateAsync({
                    default_workspace_id: workspaceId,
                    email: profileQuery.data?.email,
                    fullname: profileQuery.data?.fullname,
                  });
                }}
                organizations={session.availableOrganizations}
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
                          active={
                            item.label === "Overview"
                              ? isOverviewNavActive(location.pathname, item.to)
                              : item.label === "Timer"
                                ? isTimerNavActive(location.pathname, item.to)
                                : isSectionNavActive(location.pathname, item.to)
                          }
                          badge={item.label === "Timer" ? timerBadge : item.badge}
                          disabled={item.disabled}
                          key={`${section.title}-${item.label}`}
                          label={item.label}
                          to={item.to}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </nav>

              {adminSection ? (
                <section className="sticky bottom-0 bg-[var(--track-panel)] px-0 pb-[15px] pt-3">
                  <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                    {adminSection.title}
                  </h2>
                  <div className="mt-2 space-y-0.5">
                    {adminSection.items.map((item) => (
                      <ShellNavItem
                        active={isSectionNavActive(location.pathname, item.to)}
                        badge={item.badge}
                        disabled={item.disabled}
                        key={`${adminSection.title}-${item.label}`}
                        label={item.label}
                        to={item.to}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </aside>

        <main
          className={`min-w-0 flex-1 overflow-x-auto bg-[var(--track-surface)] ${
            isTimerRoute ? "overflow-y-hidden" : "overflow-y-auto"
          }`}
          data-testid="app-shell-main"
        >
          <div className={isTimerRoute ? "h-full min-h-0" : "min-h-full"}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function isAccountScopedShellPath(pathname: string): boolean {
  return pathname === "/overview" || pathname === "/timer";
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
      className={`flex h-7 items-center gap-3 rounded-[6px] px-1.5 text-[14px] font-medium ${
        active
          ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
          : "text-[var(--track-text-muted)]"
      } ${disabled ? "opacity-55" : "hover:bg-[var(--track-surface)] hover:text-white"}`}
    >
      <TrackingIcon className="h-4 w-[14px] shrink-0" name={navIconName(label)} />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-[8px] bg-[var(--track-border)] px-1.5 py-0.5 text-[12px] leading-none text-[var(--track-text-muted)]">
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
  const tooltipText =
    icon === "plan"
      ? "opentoggl plan is comming"
      : icon === "focus"
        ? "opentoggl focus is comming"
        : undefined;

  return (
    <button
      aria-label={icon}
      className="group relative flex h-10 w-full items-center justify-center py-[7px]"
      title={tooltipText}
      type="button"
    >
      <span
        className={`flex size-[26px] items-center justify-center rounded-full border ${
          active
            ? "border-transparent bg-[var(--track-accent)] text-black"
            : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)]"
        }`}
      >
        <TrackingIcon className="size-4" name={icon} />
      </span>
      {tooltipText ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-[var(--track-border)] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {tooltipText}
        </span>
      ) : null}
    </button>
  );
}

function navIconName(label: string) {
  switch (label) {
    case "Overview":
      return "overview";
    case "Timer":
      return "timer";
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
