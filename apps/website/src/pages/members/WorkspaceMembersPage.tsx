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
    <main aria-label="workspace-members" className="space-y-4 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Workspace Members</h1>
          <p className="text-sm text-gray-600">
            Members sourced from the workspace contract data.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Invite members
        </button>
      </header>

      {membersQuery.isPending ? (
        <section
          aria-label="Workspace members list"
          data-testid="members-list"
          className="rounded-lg border p-4 text-sm text-gray-600"
        >
          Loading members…
        </section>
      ) : null}

      <AppPanel className="bg-white/95">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleInviteSubmit}>
          <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
            Invite by email
            <input
              className="rounded-2xl border border-slate-300 px-4 py-3"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-2 text-sm font-medium text-slate-700">
            Role
            <select
              className="rounded-2xl border border-slate-300 px-4 py-3"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <AppButton type="submit">Send invite</AppButton>
          {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
        </form>
      </AppPanel>

      {membersQuery.isSuccess ? (
        <section
          aria-label="Workspace members list"
          data-testid="members-list"
          className="divide-y rounded-lg border"
        >
          {membersQuery.data.members.map((member) => {
            const canDisable = member.status === "joined" || member.status === "restored";
            const canRestore = member.status === "disabled";

            return (
              <article
                key={member.id}
                className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 p-4"
                data-member-id={member.id}
              >
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-gray-700">{member.email}</div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="text-gray-500 uppercase tracking-wide">{member.role}</div>
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
