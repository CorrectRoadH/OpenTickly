import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useState } from "react";

import { useCreateGroupMutation, useGroupsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function GroupsPage(): ReactElement {
  const session = useSession();
  const groupsQuery = useGroupsQuery(session.currentWorkspace.id);
  const createGroupMutation = useCreateGroupMutation(session.currentWorkspace.id);
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (groupsQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading groups…</p>
      </AppPanel>
    );
  }

  const groups = groupsQuery.data?.groups ?? [];
  const activeCount = groups.filter((group) => group.active).length;

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createGroupMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: groupName,
    });
    setGroupName("");
    setStatus("Group created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Groups</h1>
          <p className="text-sm leading-6 text-slate-600">
            Transition state. This page keeps workspace groups visible, but the documented group
            management surface still needs its dedicated information architecture and membership
            controls.
          </p>
        </div>
        <AppButton type="button">Create group</AppButton>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateGroup}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Group name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        </label>
        <AppButton type="submit">Save group</AppButton>
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Groups list">
        {groups.map((group) => {
          const statusLabel = group.active ? "Active" : "Inactive";

          return (
            <li key={group.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                <p className="text-xs text-slate-600">Group · {statusLabel}</p>
                <p className="text-[11px] text-slate-500">Workspace {group.workspace_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Transition state. Showing {groups.length} group{groups.length === 1 ? "" : "s"} for
          workspace {session.currentWorkspace.id}, with {activeCount} active. Exit when the
          documented group management flow and membership controls are in place and covered by
          page-flow evidence.
        </p>
      </div>
    </AppPanel>
  );
}
