import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SidebarNavSections } from "./AppShellSidebarNav.tsx";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  function handleWorkspaceChange(workspaceId: number) {
    if (isAccountScopedShellPath(location.pathname)) {
      const previousWorkspaceId = session.currentWorkspace.id;
      setCurrentWorkspaceId(workspaceId);
      void updateWebSessionMutation.mutateAsync({ workspace_id: workspaceId }).catch(() => {
        setCurrentWorkspaceId(previousWorkspaceId);
      });
      return;
    }

    void navigate({
      to: swapWorkspaceInPath(location.pathname, workspaceId, location.searchStr),
    });
  }

  async function handleSetDefault(workspaceId: number) {
    await updateProfileMutation.mutateAsync({
      default_workspace_id: workspaceId,
      email: profileQuery.data?.email,
      fullname: profileQuery.data?.fullname,
    });
  }

  const workspaceSwitcherProps = {
    currentOrganization: session.currentOrganization,
    inviteMembersPath: `/workspaces/${session.currentWorkspace.id}/members`,
    managePath: session.currentOrganization
      ? buildOrganizationSettingsPath(session.currentOrganization.id)
      : undefined,
    onChange: handleWorkspaceChange,
    onSetDefault: handleSetDefault,
    organizations: session.availableOrganizations,
  };

  const navProps = {
    adminSection,
    pathname: location.pathname,
    primarySections,
    timerBadge,
  };

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[var(--track-surface)] text-[var(--track-text)]"
      data-testid="app-shell"
    >
      {/* Mobile top bar -- visible below lg breakpoint */}
      <div className="flex h-[56px] shrink-0 items-center gap-3 border-b border-[var(--track-border)] bg-[var(--track-panel)] px-4 lg:hidden">
        <button
          aria-label="Toggle menu"
          className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-white/6 hover:text-white"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          type="button"
        >
          <TrackingIcon className="size-5" name="menu" />
        </button>
        <span className="text-[15px] font-semibold text-white">opentoggl</span>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeMobileMenu();
            }}
            role="button"
            tabIndex={-1}
          />
          <aside className="relative z-10 flex h-full w-[226px] flex-col overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)]">
            <div className="overflow-x-clip overflow-y-auto px-[6px] pt-2">
              <WorkspaceSwitcher {...workspaceSwitcherProps} />
            </div>
            <SidebarNavSections {...navProps} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar -- hidden below lg breakpoint */}
        <aside className="hidden h-full w-[226px] shrink-0 overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)] lg:flex">
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
              <WorkspaceSwitcher {...workspaceSwitcherProps} />
            </div>
            <SidebarNavSections {...navProps} />
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

function RailButton({
  active = false,
  icon,
}: {
  active?: boolean;
  icon: "bell" | "focus" | "help" | "plan" | "track";
}): ReactElement {
  const tooltipText =
    icon === "plan"
      ? "opentoggl plan is coming"
      : icon === "focus"
        ? "opentoggl focus is coming"
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
