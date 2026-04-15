import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type ReactElement, useState } from "react";
import { Loader2 } from "lucide-react";

import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";
import { useLogoutMutation, useUpdateWebSessionMutation } from "../../shared/query/web-shell.ts";
import { useSession, useSessionActions } from "../../shared/session/session-context.tsx";
import { ChevronRightIcon } from "../../shared/ui/icons.tsx";

export function MobileMePage(): ReactElement {
  const { t } = useTranslation("mobile");
  const navigate = useNavigate();
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const logoutMutation = useLogoutMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();

  const profileName = session.user.fullName || session.user.email || t("profile");
  const [switchingOrgId, setSwitchingOrgId] = useState<number | null>(null);

  function handleWorkspaceChange(workspaceId: number, orgId: number) {
    const previousWorkspaceId = session.currentWorkspace.id;
    setSwitchingOrgId(orgId);
    setCurrentWorkspaceId(workspaceId);
    void updateWebSessionMutation
      .mutateAsync({ workspace_id: workspaceId })
      .catch(() => {
        setCurrentWorkspaceId(previousWorkspaceId);
      })
      .finally(() => {
        setSwitchingOrgId(null);
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

      {/* Organization switcher */}
      <SectionHeader title={t("organization")} />
      <div className="border-b border-[var(--track-border)]">
        {session.availableOrganizations.map((org) => {
          const isCurrent = org.isCurrent;
          const isSwitching = switchingOrgId === org.id;
          return (
            <button
              key={org.id}
              className={`flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/[0.03] ${
                isCurrent ? "bg-[var(--track-accent)]/8" : "hover:bg-[var(--track-row-hover)]"
              }`}
              disabled={isSwitching}
              onClick={() => {
                if (org.defaultWorkspaceId) {
                  handleWorkspaceChange(org.defaultWorkspaceId, org.id);
                }
              }}
              type="button"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[14px] ${isCurrent ? "font-semibold text-[var(--track-accent)]" : "text-white"}`}
                >
                  {org.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isSwitching ? (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 animate-spin text-[var(--track-accent)]"
                  />
                ) : null}
                {org.isDefault ? (
                  <span className="text-[11px] text-[var(--track-text-muted)]">{t("default")}</span>
                ) : null}
                {isCurrent ? (
                  <span className="text-[12px] text-[var(--track-accent)]">{t("current")}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <SectionHeader title={t("settings")} />
      <div className="border-b border-[var(--track-border)]">
        <MenuLink label={t("profileSettings")} onClick={() => void navigate({ to: "/profile" })} />
        <MenuLink label={t("accountSettings")} onClick={() => void navigate({ to: "/account" })} />
      </div>

      {/* Logout */}
      <div className="px-4 py-5">
        <button
          className="flex w-full items-center justify-center rounded-[8px] border border-[var(--track-danger-border-muted)] py-2.5 text-[14px] text-[var(--track-danger-text)] transition hover:bg-[var(--track-danger-surface-muted)]"
          disabled={logoutMutation.isPending}
          onClick={handleLogout}
          type="button"
        >
          {logoutMutation.isPending ? t("loggingOut") : t("logOut")}
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
      className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-[14px] text-white transition hover:bg-[var(--track-row-hover)] active:bg-white/[0.03]"
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <ChevronRightIcon className="size-4 text-[var(--track-text-muted)]" />
    </button>
  );
}
