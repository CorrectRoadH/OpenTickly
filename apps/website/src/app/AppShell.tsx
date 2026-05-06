import { useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LiveDuration } from "../features/tracking/LiveDuration.tsx";

import { Dropdown, MenuSeparator, useDropdownClose } from "@opentickly/web-ui";

import { SidebarNavSections } from "./AppShellSidebarNav.tsx";
import { WorkspaceSwitcher } from "../features/session/WorkspaceSwitcher.tsx";
import { KeyboardShortcutsDialog } from "../features/tracking/KeyboardShortcutsDialog.tsx";
import { ChevronRightIcon, MenuIcon } from "../shared/ui/icons.tsx";
import { resolveEntryDurationSeconds } from "../features/tracking/overview-data.ts";
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
  const { t } = useTranslation(["appShell", "navigation"]);
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const profileQuery = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();
  const sections = shellNavigationItems(session, t);
  const adminSection = sections[sections.length - 1];
  const primarySections = sections.slice(0, -1);
  const profileName = session.user.fullName || session.user.email || "Profile";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const currentTimeEntryQuery = useCurrentTimeEntryQuery();
  const runningEntry = currentTimeEntryQuery.data;
  const { showTimeInTitle, showAnimations } = useUserPreferences();

  // Sync data-reduce-motion attribute on <html> for global CSS animation control.
  useEffect(() => {
    if (showAnimations) {
      document.documentElement.removeAttribute("data-reduce-motion");
    } else {
      document.documentElement.setAttribute("data-reduce-motion", "");
    }
  }, [showAnimations]);

  // Update document.title every second when a timer is running.
  // Uses a self-contained interval so the Shell component never re-renders.
  useEffect(() => {
    if (!runningEntry || !showTimeInTitle) {
      document.title = "OpenTickly";
      return;
    }
    function updateTitle() {
      const seconds = resolveEntryDurationSeconds(runningEntry!, Date.now());
      const h = Math.floor(seconds / 3600);
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      document.title = `${h}:${m}:${s} \u00B7 OpenTickly`;
    }
    updateTitle();
    const id = setInterval(updateTitle, 1000);
    return () => {
      clearInterval(id);
      document.title = "OpenTickly";
    };
  }, [runningEntry, showTimeInTitle]);

  // Timer badge in sidebar — LiveDuration handles its own tick internally,
  // so the Shell never re-renders for timer display.
  const timerBadge = runningEntry ? <LiveDuration entry={runningEntry} /> : undefined;

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
      ? buildOrganizationSettingsPath({ organizationId: session.currentOrganization.id })
      : undefined,
    onChange: handleWorkspaceChange,
    onSetDefault: handleSetDefault,
    organizations: session.availableOrganizations,
  };

  const navProps = {
    adminSection,
    isTimerRunning: !!runningEntry,
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
          aria-label={t("toggleMenu")}
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
            aria-label={t("closeMenu")}
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeMobileMenu();
            }}
            role="button"
            tabIndex={-1}
          />
          <aside className="relative z-10 flex h-full w-[226px] flex-col overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)]">
            <div className="shrink-0 overflow-x-clip px-[6px] pb-[5px] pt-2">
              <WorkspaceSwitcher {...workspaceSwitcherProps} />
            </div>
            <SidebarNavSections {...navProps} />
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar -- fixed, stays in place during window scroll */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[226px] overflow-hidden bg-[var(--track-panel)] shadow-[1px_0px_0px_0px_var(--track-border)] lg:flex">
        <div className="flex w-[47px] flex-col items-center justify-between border-r border-[var(--track-border)] bg-black py-2">
          <BrandRailMark />
          <div className="space-y-1">
            <ProfileMenuButton
              email={session.user.email}
              imageUrl={session.user.imageUrl}
              name={profileName}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--track-panel)]">
          <div className="shrink-0 overflow-x-clip px-[6px] pb-[5px] pt-2">
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
  const { t } = useTranslation("appShell");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  return (
    <>
      <Dropdown
        placement="right-bottom"
        panelClassName="w-[300px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] shadow-[0_18px_48px_var(--track-shadow-elevated)]"
        trigger={
          <button
            aria-label={t("profileMenu")}
            className="flex flex-col items-center gap-1 py-1 text-[var(--track-text-muted)] transition hover:text-white"
            type="button"
          >
            <UserAvatar
              className="size-[26px] overflow-hidden border border-[var(--track-surface)]"
              imageUrl={imageUrl}
              name={name}
              textClassName="text-[11px] font-semibold"
            />
            <span className="text-[8px] font-medium uppercase tracking-[0.08em]">
              {t("profile")}
            </span>
          </button>
        }
      >
        <ProfileMenuContent
          email={email}
          imageUrl={imageUrl}
          name={name}
          navigate={navigate}
          logoutMutation={logoutMutation}
          onShortcuts={() => setShortcutsOpen(true)}
        />
      </Dropdown>

      {shortcutsOpen ? <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
    </>
  );
}

function ProfileMenuContent({
  email,
  imageUrl,
  name,
  navigate,
  logoutMutation,
  onShortcuts,
}: {
  email: string;
  imageUrl?: string | null;
  name: string;
  navigate: ReturnType<typeof useNavigate>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  onShortcuts: () => void;
}): ReactElement {
  const { t } = useTranslation("appShell");
  const close = useDropdownClose();

  return (
    <div className="p-2" role="menu">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <UserAvatar
          className="size-9 shrink-0 overflow-hidden border border-[var(--track-border)]"
          imageUrl={imageUrl}
          name={name}
          textClassName="text-[13px] font-semibold"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white">{name}</p>
          <p className="truncate text-[12px] text-[var(--track-text-muted)]">{email}</p>
        </div>
      </div>

      <MenuSeparator />

      <div className="space-y-1 py-1">
        <ProfileMenuAction
          label={t("profileSettings")}
          onClick={() => {
            close();
            void navigate({ to: "/profile" });
          }}
        />
        <ProfileMenuAction
          label={t("accountSettings")}
          onClick={() => {
            close();
            void navigate({ to: "/account" });
          }}
        />
        <ProfileMenuAction
          label={t("keyboardShortcuts")}
          onClick={() => {
            close();
            onShortcuts();
          }}
          trailing={
            <kbd className="flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-[var(--track-border)] px-1 text-[11px] font-medium text-[var(--track-text-muted)]">
              ?
            </kbd>
          }
        />
      </div>

      <MenuSeparator />

      <div className="py-1">
        <ProfileMenuAction
          destructive
          label={t("logOut")}
          onClick={() => {
            close();
            void logoutMutation.mutateAsync().then(() => {
              window.location.href = "/";
            });
          }}
          trailing={null}
        />
      </div>
    </div>
  );
}

function ProfileMenuAction({
  destructive = false,
  label,
  onClick,
  trailing = <ChevronRightIcon className="size-4 text-[var(--track-text-muted)]" />,
}: {
  destructive?: boolean;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
}): ReactElement {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium transition hover:bg-[var(--track-row-hover)] ${
        destructive ? "text-[var(--track-danger-text)]" : "text-white"
      }`}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span>{label}</span>
      {trailing}
    </button>
  );
}

function BrandRailMark(): ReactElement {
  return (
    <div
      aria-label="OpenTickly"
      className="flex w-full items-center justify-center py-[7px]"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="size-[26px] drop-shadow-[0_8px_24px_rgba(224,93,38,0.35)]"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#e05d26" height="32" rx="8" width="32" />
        <text
          fill="white"
          fontFamily="Arial, sans-serif"
          fontSize="20"
          fontWeight="bold"
          textAnchor="middle"
          x="16"
          y="23"
        >
          t
        </text>
      </svg>
    </div>
  );
}
