import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import { SidebarNavSections } from "./AppShellSidebarNav.tsx";
import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { KeyboardShortcutsDialog } from "../features/tracking/KeyboardShortcutsDialog.tsx";
import { FocusIcon, MenuIcon, PlanIcon, TrackIcon } from "../shared/ui/icons.tsx";
import {
  formatClockDuration,
  resolveEntryDurationSeconds,
} from "../features/tracking/overview-data.ts";
import { useUserPreferences } from "../shared/query/useUserPreferences.ts";
import { shellNavigationItems } from "../shared/lib/shell-navigation.ts";
import { UserAvatar } from "../shared/ui/UserAvatar.tsx";
import {
  buildOrganizationSettingsPath,
  swapWorkspaceInPath,
} from "../shared/lib/workspace-routing.ts";
import {
  useCurrentTimeEntryQuery,
  useLogoutMutation,
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
  const { durationFormat } = useUserPreferences();
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const profileQuery = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();
  const sections = shellNavigationItems(session);
  const adminSection = sections[sections.length - 1];
  const primarySections = sections.slice(0, -1);
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

  useEffect(() => {
    if (!runningEntry) {
      document.title = "OpenToggl";
      return;
    }
    const seconds = resolveEntryDurationSeconds(runningEntry, nowMs);
    const h = Math.floor(seconds / 3600);
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    document.title = `${h}:${m}:${s} \u00B7 OpenToggl`;
  }, [runningEntry, nowMs]);

  const timerBadge = useMemo(() => {
    if (!runningEntry) {
      return undefined;
    }
    const seconds = resolveEntryDurationSeconds(runningEntry, nowMs);
    return formatClockDuration(seconds, durationFormat);
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

  // All pages scroll via window.scroll (browser native). Sidebar is fixed,
  // main content is in normal document flow offset by the sidebar width.
  // This matches Toggl's architecture and eliminates internal scroll containers.
  return (
    <div
      className="min-h-screen bg-[var(--track-surface)] text-[var(--track-text)]"
      data-testid="app-shell"
    >
      {/* Mobile top bar -- sticky at viewport top, visible below lg */}
      <div className="sticky top-0 z-40 flex h-[56px] items-center gap-3 border-b border-[var(--track-border)] bg-[var(--track-panel)] px-4 lg:hidden">
        <button
          aria-label="Toggle menu"
          className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-white/6 hover:text-white"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          type="button"
        >
          <MenuIcon className="size-5" />
        </button>
        <span className="text-[14px] font-semibold text-white">opentoggl</span>
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

      {/* Desktop sidebar -- fixed, stays in place during window scroll */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[226px] overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)] lg:flex">
        <div className="flex w-[47px] flex-col items-center justify-between border-r border-[var(--track-border)] bg-black py-2">
          <div className="space-y-0.5">
            <RailButton active icon={<TrackIcon className="size-4" />} label="track" />
            <RailButton
              icon={<PlanIcon className="size-4" />}
              label="plan"
              tooltip="opentoggl plan is coming"
            />
            <RailButton
              icon={<FocusIcon className="size-4" />}
              label="focus"
              tooltip="opentoggl focus is coming"
            />
          </div>
          <div className="space-y-1">
            <ProfileMenuButton
              email={session.user.email}
              imageUrl={session.user.imageUrl}
              name={profileName}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--track-panel)]">
          <div className="overflow-x-clip overflow-y-auto px-[6px] pt-2">
            <WorkspaceSwitcher {...workspaceSwitcherProps} />
          </div>
          <SidebarNavSections {...navProps} />
        </div>
      </aside>

      {/* Main content -- offset by sidebar width on desktop, scrolls with window */}
      <main
        className="min-h-screen bg-[var(--track-surface)] lg:ml-[226px]"
        data-testid="app-shell-main"
      >
        {children}
      </main>
    </div>
  );
}

function isAccountScopedShellPath(pathname: string): boolean {
  return pathname === "/overview" || pathname === "/timer";
}

function ProfileMenuButton({
  email,
  imageUrl,
  name,
}: {
  email: string;
  imageUrl?: string | null;
  name: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPosition({
        left: rect.right + 12,
        bottom: window.innerHeight - rect.bottom,
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Profile menu"
        className="flex flex-col items-center gap-1 py-1 text-[var(--track-text-muted)] transition hover:text-white"
        onClick={() => setOpen((prev) => !prev)}
        ref={buttonRef}
        type="button"
      >
        <UserAvatar
          className="size-[26px] overflow-hidden border border-[var(--track-surface)]"
          imageUrl={imageUrl}
          name={name}
          textClassName="text-[11px] font-semibold"
        />
        <span className="text-[8px] font-medium uppercase tracking-[0.08em]">Profile</span>
      </button>

      {open && panelPosition
        ? createPortal(
            <div
              className="fixed z-50 w-[300px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] shadow-[0_18px_48px_var(--track-shadow-elevated)]"
              ref={panelRef}
              role="menu"
              style={{
                left: panelPosition.left,
                bottom: panelPosition.bottom,
              }}
            >
              {/* User info */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white">{name}</p>
                  <p className="truncate text-[12px] text-[var(--track-text-muted)]">{email}</p>
                </div>
                <UserAvatar
                  className="size-[40px] shrink-0 overflow-hidden"
                  imageUrl={imageUrl}
                  name={name}
                  textClassName="text-[14px] font-semibold"
                />
              </div>

              <div className="mx-4 border-t border-[var(--track-border)]" />

              {/* Menu items */}
              <div className="py-1">
                <button
                  className="flex w-full items-center px-5 py-2.5 text-[14px] text-white transition hover:bg-[var(--track-row-hover)]"
                  onClick={() => {
                    setOpen(false);
                    void navigate({ to: "/profile" });
                  }}
                  role="menuitem"
                  type="button"
                >
                  Profile settings
                </button>
                <button
                  className="flex w-full items-center px-5 py-2.5 text-[14px] text-white transition hover:bg-[var(--track-row-hover)]"
                  onClick={() => {
                    setOpen(false);
                    void navigate({ to: "/account" });
                  }}
                  role="menuitem"
                  type="button"
                >
                  Account settings
                </button>
                <button
                  className="flex w-full items-center justify-between px-5 py-2.5 text-[14px] text-white transition hover:bg-[var(--track-row-hover)]"
                  onClick={() => {
                    setOpen(false);
                    setShortcutsOpen(true);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span>Keyboard shortcuts</span>
                  <kbd className="flex size-[22px] items-center justify-center rounded-[5px] border border-[var(--track-border)] text-[12px] font-medium text-[var(--track-text-muted)]">
                    ?
                  </kbd>
                </button>
              </div>

              <div className="mx-4 border-t border-[var(--track-border)]" />

              <div className="py-1">
                <button
                  className="flex w-full items-center px-5 py-2.5 text-[14px] text-white transition hover:bg-[var(--track-row-hover)]"
                  onClick={() => {
                    setOpen(false);
                    void logoutMutation.mutateAsync().then(() => {
                      window.location.href = "/";
                    });
                  }}
                  role="menuitem"
                  type="button"
                >
                  Log out
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
    </>
  );
}

function RailButton({
  active = false,
  icon,
  label,
  tooltip,
}: {
  active?: boolean;
  icon: ReactElement;
  label: string;
  tooltip?: string;
}): ReactElement {
  return (
    <button
      aria-label={label}
      className="group relative flex h-10 w-full items-center justify-center py-[7px]"
      title={tooltip}
      type="button"
    >
      <span
        className={`flex size-[26px] items-center justify-center rounded-full border ${
          active
            ? "border-transparent bg-[var(--track-accent)] text-black"
            : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)]"
        }`}
      >
        {icon}
      </span>
      {tooltip ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-[var(--track-border)] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {tooltip}
        </span>
      ) : null}
    </button>
  );
}
