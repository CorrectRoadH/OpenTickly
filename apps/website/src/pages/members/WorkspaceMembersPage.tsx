import { type FormEvent, type ReactElement, useState } from "react";

import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  useDisableWorkspaceMemberMutation,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useRestoreWorkspaceMemberMutation,
  useWorkspaceMembersQuery,
} from "../../shared/query/web-shell.ts";
import { ShellPageHeader, ShellPrimaryButton } from "../../shared/ui/TrackDirectoryPrimitives.tsx";

export function WorkspaceMembersPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const membersQuery = useWorkspaceMembersQuery(workspaceId);
  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceId);
  const disableMutation = useDisableWorkspaceMemberMutation(workspaceId);
  const restoreMutation = useRestoreWorkspaceMemberMutation(workspaceId);
  const removeMutation = useRemoveWorkspaceMemberMutation(workspaceId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [status, setStatus] = useState<string | null>(null);

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await inviteMutation.mutateAsync({
      email: inviteEmail,
      role: inviteRole,
    });
    setInviteEmail("");
    setInviteRole("member");
    setStatus("Invitation sent");
  }

  async function handleDisableMember(memberId: number) {
    await disableMutation.mutateAsync(memberId);
    setStatus("Member disabled");
  }

  async function handleRestoreMember(memberId: number) {
    await restoreMutation.mutateAsync(memberId);
    setStatus("Member restored");
  }

  async function handleRemoveMember(memberId: number) {
    await removeMutation.mutateAsync(memberId);
    setStatus("Member removed");
  }

  return (
    <main
      aria-label="workspace-members"
      className="min-h-full space-y-5 bg-[var(--track-surface)] p-5 text-white"
    >
      <div className="border-b border-[var(--track-border)]">
        <ShellPageHeader
          action={<ShellPrimaryButton type="button">Invite members</ShellPrimaryButton>}
          title="Workspace Members"
        />
      </div>

      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        Members sourced from the workspace contract data.
      </p>

      {membersQuery.isPending ? (
        <section
          aria-label="Workspace members list"
          data-testid="members-list"
          className="rounded-[8px] border border-[var(--track-border)] p-4 text-[14px] text-[var(--track-text-muted)]"
        >
          Loading members…
        </section>
      ) : null}

      <AppPanel>
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleInviteSubmit}>
          <label className="flex min-w-[18rem] flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            Invite by email
            <input
              className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-normal normal-case tracking-normal text-white outline-none focus:border-[var(--track-accent-soft)]"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            Role
            <select
              className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] font-normal normal-case tracking-normal text-white outline-none focus:border-[var(--track-accent-soft)]"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <AppButton type="submit">Send invite</AppButton>
          {status ? (
            <p className="text-[12px] font-medium text-[var(--track-accent-text)]">{status}</p>
          ) : null}
        </form>
      </AppPanel>

      {membersQuery.isSuccess ? (
        <section
          aria-label="Workspace members list"
          data-testid="members-list"
          className="divide-y rounded-[8px] border border-[var(--track-border)]"
        >
          {membersQuery.data.members.map((member) => {
            const canDisable = member.status === "joined" || member.status === "restored";
            const canRestore = member.status === "disabled";

            return (
              <article
                key={member.id}
                className="grid grid-cols-[2fr_2fr_1fr_auto] gap-3 bg-[var(--track-surface)] p-4"
                data-member-id={member.id}
              >
                <div>
                  <div className="text-[14px] font-medium text-white">{member.name}</div>
                  <div className="text-[12px] text-[var(--track-text-muted)]">{member.email}</div>
                </div>
                <div className="text-[12px] text-[var(--track-text-muted)]">
                  <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-soft)]">
                    {member.role}
                  </div>
                  <div>{member.status}</div>
                </div>
                <dl className="sr-only">
                  <div>
                    <dt>Member ID</dt>
                    <dd>{member.id}</dd>
                  </div>
                  <div>
                    <dt>Workspace ID</dt>
                    <dd>{member.workspace_id}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canDisable ? (
                    <AppButton type="button" onClick={() => void handleDisableMember(member.id)}>
                      Disable
                    </AppButton>
                  ) : null}
                  {canRestore ? (
                    <AppButton type="button" onClick={() => void handleRestoreMember(member.id)}>
                      Restore
                    </AppButton>
                  ) : null}
                  <AppButton type="button" onClick={() => void handleRemoveMember(member.id)}>
                    Remove
                  </AppButton>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}

export default WorkspaceMembersPage;
