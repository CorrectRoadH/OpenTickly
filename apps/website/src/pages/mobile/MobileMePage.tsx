import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";
import { useLogoutMutation, useUpdateWebSessionMutation } from "../../shared/query/web-shell.ts";
import { useSession, useSessionActions } from "../../shared/session/session-context.tsx";
import { ChevronRightIcon } from "../../shared/ui/icons.tsx";

export function MobileMePage(): ReactElement {
  const navigate = useNavigate();
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const logoutMutation = useLogoutMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();

  const profileName = session.user.fullName || session.user.email || "Profile";

  function handleWorkspaceChange(workspaceId: number) {
    const previousWorkspaceId = session.currentWorkspace.id;
    setCurrentWorkspaceId(workspaceId);
    void updateWebSessionMutation.mutateAsync({ workspace_id: workspaceId }).catch(() => {
      setCurrentWorkspaceId(previousWorkspaceId);
    });
  }

  function handleLogout() {
    void logoutMutation.mutateAsync().then(() => {
      window.location.href = "/";
    });
  }

  return (
    <div className="flex flex-col">
      {/* Profile header */}
      <div className="flex items-center gap-4 border-b border-[var(--track-border)] px-4 py-5">
        <UserAvatar
          className="size-[48px] shrink-0 overflow-hidden"
          imageUrl={session.user.imageUrl}
          name={profileName}
          textClassName="text-[18px] font-semibold"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-white">{profileName}</p>
          <p className="truncate text-[13px] text-[var(--track-text-muted)]">
            {session.user.email}
          </p>
        </div>
      </div>

      {/* Current workspace */}
      <SectionHeader title="Workspace" />
      <div className="border-b border-[var(--track-border)]">
        {session.availableWorkspaces.map((ws) => {
          const isCurrent = ws.id === session.currentWorkspace.id;
          return (
            <button
              key={ws.id}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                isCurrent ? "bg-[var(--track-accent)]/8" : "hover:bg-[var(--track-row-hover)]"
              }`}
              onClick={() => handleWorkspaceChange(ws.id)}
              type="button"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[14px] ${isCurrent ? "font-semibold text-[var(--track-accent)]" : "text-white"}`}
                >
                  {ws.name}
                </p>
              </div>
              {isCurrent ? (
                <span className="shrink-0 text-[12px] text-[var(--track-accent)]">Current</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <SectionHeader title="Settings" />
      <div className="border-b border-[var(--track-border)]">
        <MenuLink label="Profile settings" onClick={() => void navigate({ to: "/profile" })} />
        <MenuLink label="Account settings" onClick={() => void navigate({ to: "/account" })} />
        <MenuLink label="Desktop version" onClick={() => void navigate({ to: "/timer" })} />
      </div>

      {/* Logout */}
      <div className="px-4 py-5">
        <button
          className="flex w-full items-center justify-center rounded-[8px] border border-[var(--track-danger-border-muted)] py-2.5 text-[14px] text-[var(--track-danger-text)] transition hover:bg-[var(--track-danger-surface-muted)]"
          disabled={logoutMutation.isPending}
          onClick={handleLogout}
          type="button"
        >
          {logoutMutation.isPending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }): ReactElement {
  return (
    <h2 className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
      {title}
    </h2>
  );
}

function MenuLink({ label, onClick }: { label: string; onClick: () => void }): ReactElement {
  return (
    <button
      className="flex w-full items-center justify-between px-4 py-3 text-[14px] text-white transition hover:bg-[var(--track-row-hover)]"
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <ChevronRightIcon className="size-4 text-[var(--track-text-muted)]" />
    </button>
  );
}
