import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  SelectDropdown,
} from "@opentoggl/web-ui";
import { toast } from "sonner";

import { WebApiError } from "../../shared/api/web-client.ts";
import { PlusIcon, SearchIcon } from "../../shared/ui/icons.tsx";
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

function resolveMemberStatusLabel(status: string): string {
  switch (status) {
    case "joined":
    case "restored":
      return "Active";
    case "disabled":
      return "Disabled";
    case "invited":
      return "Invited";
    default:
      return status;
  }
}

function isActiveMember(status: string): boolean {
  return status === "joined" || status === "restored";
}

const memberColumns: DirectoryTableColumn[] = [
  { key: "avatar", label: "", width: "42px" },
  { key: "name", label: "Name", width: "minmax(0,2fr)" },
  { key: "role", label: "Role", width: "100px" },
  { key: "status", label: "Status", width: "100px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function WorkspaceMembersPage(): ReactElement {
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

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);

  const filteredMembers = useMemo(() => {
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
  }, [members, statusFilter, search]);

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
      setStatus("Invitation sent");
    } catch (error) {
      const message =
        error instanceof WebApiError ? error.userMessage : "Could not send invitation";
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
            {resolveMemberStatusLabel(member.status)}
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
                .then(() => setStatus("Member disabled"))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : "Could not disable member",
                  ),
                );
            }}
            onRemove={(id) => {
              void removeMutation
                .mutateAsync(id)
                .then(() => setStatus("Member removed"))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : "Could not remove member",
                  ),
                );
            }}
            onRestore={(id) => {
              void restoreMutation
                .mutateAsync(id)
                .then(() => setStatus("Member restored"))
                .catch((error) =>
                  toast.error(
                    error instanceof WebApiError ? error.userMessage : "Could not restore member",
                  ),
                );
            }}
          />
        </div>
      </>
    );
  }

  if (membersQuery.isPending) {
    return <DirectorySurfaceMessage message="Loading members..." />;
  }

  if (membersQuery.isError) {
    return (
      <DirectorySurfaceMessage
        message="Unable to load members. Refresh to try again."
        tone="error"
      />
    );
  }

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] text-white" data-testid="members-page">
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">Members</h1>
          <AppButton
            data-testid="members-invite-button"
            onClick={() => setInviteDialogOpen(true)}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            Invite member
          </AppButton>
        </div>
        <div
          className="flex min-h-[46px] flex-wrap items-center gap-3 border-t border-[var(--track-border)] px-5 py-2"
          data-testid="members-filter-bar"
        >
          <SelectDropdown
            aria-label="Member status filter"
            onChange={(v) => setStatusFilter(v as MemberStatusFilter)}
            options={[
              { value: "all", label: "All members" },
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
              { value: "invited", label: "Invited" },
            ]}
            value={statusFilter}
          />
          <label className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--track-text-muted)]">
              <SearchIcon className="size-3.5" />
            </span>
            <input
              className="h-9 w-[180px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-8 pr-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members..."
              value={search}
            />
          </label>
          {status ? (
            <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{status}</span>
          ) : null}
        </div>
      </header>

      <DirectoryTable
        columns={memberColumns}
        data-testid="members-list"
        emptyState={
          search.trim()
            ? "No members match your search."
            : statusFilter !== "all"
              ? `No ${statusFilter} members.`
              : "No members in this workspace yet. Invite someone to get started."
        }
        footer={
          <span data-testid="members-summary">
            {members.length} member{members.length === 1 ? "" : "s"} in{" "}
            {session.currentWorkspace.name}. Active: {activeCount} · Disabled: {disabledCount} ·
            Invited: {invitedCount}
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
