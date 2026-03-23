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
import {
  buildOrganizationSettingsPath,
  swapWorkspaceInPath,
} from "../shared/lib/workspace-routing.ts";
import { useCurrentTimeEntryQuery } from "../shared/query/web-shell.ts";
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
  const sections = shellNavigationItems(session);
  const adminSection = sections[sections.length - 1];
  const primarySections = sections.slice(0, -1);
  const profileInitial = (session.user.fullName || session.user.email || "P")
    .trim()
    .charAt(0)
    .toUpperCase();

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
    <div className="h-dvh overflow-hidden bg-[#161616] text-white" data-testid="app-shell">
      <div className="flex h-full">
        <aside className="flex h-full w-[226px] shrink-0 overflow-hidden bg-[#0d0d0d] shadow-[1px_0px_0px_0px_#3a3a3a]">
          <div className="flex w-[47px] flex-col items-center justify-between border-r border-[#3a3a3a] bg-black py-2">
            <div className="space-y-0.5">
              <RailButton active icon="track" />
              <RailButton icon="plan" />
              <RailButton icon="focus" />
            </div>
            <button
              aria-label="Navigation rail"
              className="flex h-[34px] w-full items-center justify-center text-[#a4a4a4]"
              type="button"
            >
              <TrackingIcon className="h-4 w-[21px]" name="menu" />
            </button>
            <div className="space-y-1">
              <div className="flex flex-col items-center gap-1 py-1">
                <div className="flex size-[26px] items-center justify-center overflow-hidden rounded-full border border-[#1b1b1b] bg-[#d94182] text-[11px] font-semibold text-white">
                  {profileInitial}
                </div>
                <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-[#a4a4a4]">
                  Profile
                </span>
              </div>
              <RailButton icon="bell" />
              <RailButton icon="help" />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-[#0d0d0d]">
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
                    setCurrentWorkspaceId(workspaceId);
                    return;
                  }

                  void navigate({
                    to: swapWorkspaceInPath(location.pathname, workspaceId, location.searchStr),
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
                    <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#a4a4a4]">
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
                <section className="sticky bottom-0 bg-[#0d0d0d] px-0 pb-[15px] pt-3">
                  <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#a4a4a4]">
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
          className="min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-[#161616]"
          data-testid="app-shell-main"
        >
          <div className="min-h-full">{children}</div>
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
        active ? "bg-[#472443] text-[#f7d0f0]" : "text-[#a4a4a4]"
      } ${disabled ? "opacity-55" : "hover:bg-[#1b1b1b] hover:text-white"}`}
    >
      <TrackingIcon className="h-4 w-[14px] shrink-0" name={navIconName(label)} />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-[8px] bg-[#3a3a3a] px-1.5 py-0.5 text-[12px] leading-none text-[#b2b2b2]">
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
      className="flex h-10 w-full items-center justify-center py-[7px]"
      type="button"
    >
      <span
        className={`flex size-[26px] items-center justify-center rounded-full border ${
          active
            ? "border-transparent bg-[#e57bd9] text-black"
            : "border-[#3a3a3a] bg-[#1b1b1b] text-[#a4a4a4]"
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
