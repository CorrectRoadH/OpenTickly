import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";

import { useCreateGroupMutation, useGroupsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function GroupsPage(): ReactElement {
  const session = useSession();
  const groupsQuery = useGroupsQuery(session.currentWorkspace.id);
  const createGroupMutation = useCreateGroupMutation(session.currentWorkspace.id);
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const groupNameInputRef = useRef<HTMLInputElement | null>(null);

  const groups = normalizeGroups(groupsQuery.data);
  const activeCount = groups.filter((group) => Boolean(group.has_users)).length;
  const inactiveCount = groups.length - activeCount;
  const trimmedGroupName = groupName.trim();

  if (groupsQuery.isPending) {
    return (
      <AppPanel tone="muted">
        <p className="text-sm text-slate-400">Loading groups…</p>
      </AppPanel>
    );
  }

  if (groupsQuery.isError) {
    return (
      <AppPanel tone="danger">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Groups</h1>
          <p className="text-sm leading-6 text-rose-300">
            Unable to load groups. Refresh to try again.
          </p>
        </div>
      </AppPanel>
    );
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedGroupName.length === 0) {
      return;
    }

    await createGroupMutation.mutateAsync(trimmedGroupName);
    setGroupName("");
    setStatus("Group created");
  }

  return (
    <AppPanel data-testid="groups-page" tone="muted">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Groups</h1>
          <p className="text-sm text-slate-500">Workspace group directory</p>
          <p className="text-sm leading-6 text-slate-400">
            Review workspace groups, member allocation boundaries, and active status from one page
            inside the current workspace scope.
          </p>
        </div>
        <AppButton onClick={() => groupNameInputRef.current?.focus()} type="button">
          Create group
        </AppButton>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        data-testid="groups-create-form"
        onSubmit={handleCreateGroup}
      >
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-300">
          Group name
          <input
            ref={groupNameInputRef}
            className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        </label>
        <AppButton
          disabled={trimmedGroupName.length === 0 || createGroupMutation.isPending}
          type="submit"
        >
          Save group
        </AppButton>
        {status ? (
          <p className="text-sm font-medium text-[var(--track-text-accent)]">{status}</p>
        ) : null}
      </form>

      {groups.length > 0 ? (
        <ul
          className="mt-6 divide-y divide-white/8"
          aria-label="Groups list"
          data-testid="groups-list"
        >
          <li className="py-2 text-[11px] font-medium uppercase text-slate-500">
            Workspace {session.currentWorkspace.id}
          </li>
          {groups.map((group) => {
            const statusLabel = group.has_users ? "Active" : "Inactive";

            return (
              <li key={group.id} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{group.name}</p>
                  <p className="text-xs text-slate-400">Group · {statusLabel}</p>
                  <p className="text-[11px] text-slate-500">Workspace {group.workspace_id}</p>
                </div>
                <span className="rounded-lg border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-3 py-1 text-xs font-medium text-slate-300">
                  {statusLabel}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <section
          className="mt-6 rounded-xl border border-dashed border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-5 py-5 text-sm text-slate-300"
          data-testid="groups-empty-state"
        >
          <p className="font-semibold text-white">No groups in this workspace yet.</p>
          <p className="mt-2 text-slate-400">
            Create a group to keep project access and member assignments discoverable from the
            workspace app.
          </p>
        </section>
      )}

      <div
        className="mt-6 rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] p-3 text-sm text-slate-300"
        data-testid="groups-summary"
      >
        <p className="font-medium text-white">
          Showing {groups.length} group{groups.length === 1 ? "" : "s"} for workspace{" "}
          {session.currentWorkspace.id}, with {activeCount} active and {inactiveCount} inactive.
        </p>
      </div>
    </AppPanel>
  );
}

type GroupListItem = {
  has_users?: boolean | null;
  id: number;
  name: string;
  workspace_id?: number | null;
};

function normalizeGroups(data: unknown): GroupListItem[] {
  if (Array.isArray(data)) {
    return data as GroupListItem[];
  }

  if (hasGroupArray(data, "groups")) {
    return data.groups;
  }

  if (hasGroupArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasGroupArray(
  value: unknown,
  key: "data" | "groups",
): value is Record<typeof key, GroupListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
