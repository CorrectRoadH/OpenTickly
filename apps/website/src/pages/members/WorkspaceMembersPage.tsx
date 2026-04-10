import { type ReactElement, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppButton,
  AppInput,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  SelectDropdown,
} from "@opentoggl/web-ui";
import { toast } from "sonner";

import { WebApiError } from "../../shared/api/web-client.ts";
import { MembersIcon, PlusIcon, SearchIcon } from "../../shared/ui/icons.tsx";
import {
  useDisableWorkspaceMemberMutation,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useRestoreWorkspaceMemberMutation,
  useWorkspaceMembersQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { InviteMemberDialog } from "./InviteMemberDialog.tsx";
import { MemberRowActions } from "./MemberRowActions.tsx";

type MemberStatusFilter = "all" | "active" | "disabled" | "invited";

function resolveMemberStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case "joined":
    case "restored":
      return t("active");
    case "disabled":
      return t("disabled");
    case "invited":
      return t("invited");
    default:
      return status;
  }
}

function isActiveMember(status: string): boolean {
  return status === "joined" || status === "restored";
}

const memberColumns = (t: (key: string) => string): DirectoryTableColumn[] => [
  { key: "avatar", label: "", width: "42px" },
  { key: "name", label: t("name"), width: "minmax(0,2fr)" },
  { key: "role", label: t("role"), width: "100px" },
  { key: "status", label: t("status"), width: "100px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function WorkspaceMembersPage(): ReactElement {
  const { t } = useTranslation("members");
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const membersQuery = useWorkspaceMembersQuery(workspaceId);
  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceId);
  const disableMutation = useDisableWorkspaceMemberMutation(workspaceId);
  const restoreMutation = useRestoreWorkspaceMemberMutation(workspaceId);
  const removeMutation = useRemoveWorkspaceMemberMutation(workspaceId);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [search, setSearch] = useState("");

  const members = membersQuery.data?.members ?? [];

  const filteredMembers = (() => {
    return members.filter((member) => {
      if (statusFilter === "active" && !isActiveMember(member.status)) return false;
      if (statusFilter === "disabled" && member.status !== "disabled") return false;
      if (statusFilter === "invited" && member.status !== "invited") return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q);
      }

      return true;
    });
  })();

  const activeCount = members.filter((m) => isActiveMember(m.status)).length;
  const disabledCount = members.filter((m) => m.status === "disabled").length;
  const invitedCount = members.filter((m) => m.status === "invited").length;

  async function handleInvite() {
    const trimmed = inviteEmail.trim();
    if (!trimmed) return;

    try {
      await inviteMutation.mutateAsync({ email: trimmed, role: inviteRole });
      setInviteEmail("");
      setInviteRole("member");
      setInviteDialogOpen(false);
      setStatus(t("invitationSent"));
    } catch (error) {
      const message =
        error instanceof WebApiError ? error.userMessage : t("couldNotSendInvitation");
      toast.error(message);
    }
  }

  function renderMemberRow(member: (typeof members)[number]): ReactNode {
    const canDisable = member.status === "joined" || member.status === "restored";
    const canRestore = member.status === "disabled";

    return (
      <>
        <div className="flex h-[54px] items-center">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold uppercase text-[var(--track-text-muted)]">
            {member.name.charAt(0)}
          </span>
        </div>
        <div className="flex h-[54px] flex-col justify-center overflow-hidden">
          <span className="truncate text-[12px] text-white">{member.name}</span>
          <span className="truncate text-[11px] text-[var(--track-text-muted)]">
            {member.email}
          </span>
        </div>
        <div className="flex h-[54px] items-center text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
          {member.role}
        </div>
        <div className="flex h-[54px] items-center">
          <span
            className={`inline-flex h-5 items-center rounded-[4px] px-1.5 text-[10px] font-medium uppercase tracking-[0.04em] ${
              isActiveMember(member.status)
                ? "bg-emerald-900/40 text-emerald-400"
                : member.status === "disabled"
                  ? "bg-rose-900/40 text-rose-400"
                  : "bg-amber-900/40 text-amber-400"
            }`}
          >
            {resolveMemberStatusLabel(member.status, t)}
          </span>
        </div>
        <div className="flex h-[54px] items-center justify-end">
          <MemberRowActions
            canDisable={canDisable}
            canRestore={canRestore}
            memberId={member.id}
            memberName={member.name}
            onDisable={(id) => {
              void disableMutation
                .mutateAsync(id)
                .then(() => setStatus(t("memberDisabled")))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : t("couldNotDisableMember"),
                  ),
                );
            }}
            onRemove={(id) => {
              void removeMutation
                .mutateAsync(id)
                .then(() => setStatus(t("memberRemoved")))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : t("couldNotRemoveMember"),
                  ),
                );
            }}
            onRestore={(id) => {
              void restoreMutation
                .mutateAsync(id)
                .then(() => setStatus(t("memberRestored")))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : t("couldNotRestoreMember"),
                  ),
                );
            }}
          />
        </div>
      </>
    );
  }

  if (membersQuery.isPending) {
    return <DirectorySurfaceMessage message={t("loadingMembers")} />;
  }

  if (membersQuery.isError) {
    return <DirectorySurfaceMessage message={t("unableToLoadMembers")} tone="error" />;
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="members-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">{t("members")}</h1>
          <AppButton
            data-testid="members-invite-button"
            onClick={() => setInviteDialogOpen(true)}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            {t("inviteMember")}
          </AppButton>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-3 border-t border-[var(--track-border)] px-5 py-2"
          data-testid="members-filter-bar"
        >
          <SelectDropdown
            aria-label={t("memberStatusFilter")}
            onChange={(v) => setStatusFilter(v as MemberStatusFilter)}
            options={[
              { value: "all", label: t("allMembers") },
              { value: "active", label: t("active") },
              { value: "disabled", label: t("disabled") },
              { value: "invited", label: t("invited") },
            ]}
            value={statusFilter}
          />
          <AppInput
            className="w-[180px]"
            leadingIcon={<SearchIcon className="size-3.5" />}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchMembers")}
            size="sm"
            value={search}
          />
          {status ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{status}</span>
          ) : null}
        </div>
      </header>

      <DirectoryTable
        columns={memberColumns(t)}
        data-testid="members-list"
        emptyIcon={<MembersIcon className="size-5" />}
        emptyTitle={
          search.trim()
            ? t("noMembersMatchSearch")
            : statusFilter !== "all"
              ? t(
                  statusFilter === "active"
                    ? "noActiveMembers"
                    : statusFilter === "disabled"
                      ? "noDisabledMembers"
                      : "noInvitedMembers",
                )
              : t("noMembersInWorkspace")
        }
        footer={
          <span data-testid="members-summary">
            {t("showingMembersInWorkspace", {
              count: members.length,
              workspaceName: session.currentWorkspace.name,
              activeCount,
              disabledCount,
              invitedCount,
            })}
          </span>
        }
        isLoading={false}
        renderRow={renderMemberRow}
        rowKey={(member) => member.id}
        rows={filteredMembers}
      />

      {inviteDialogOpen ? (
        <InviteMemberDialog
          email={inviteEmail}
          isPending={inviteMutation.isPending}
          onClose={() => setInviteDialogOpen(false)}
          onEmailChange={setInviteEmail}
          onRoleChange={setInviteRole}
          onSubmit={() => {
            void handleInvite();
          }}
          role={inviteRole}
        />
      ) : null}
    </div>
  );
}

export default WorkspaceMembersPage;
