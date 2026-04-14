import {
  AppButton,
  Dialog,
  DialogBody,
  DialogHeader,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableRenderCountBadge,
  DropdownMenu,
  IconButton,
  useDropdownClose,
} from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { WebApiError } from "../../shared/api/web-client.ts";
import { MembersIcon, MoreIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import {
  useOrgGroupsQuery,
  useCreateOrgGroupMutation,
  useRenameOrgGroupMutation,
  useDeleteOrgGroupMutation,
  useUpdateOrgGroupMutation,
  useOrganizationMembersQuery,
} from "../../shared/query/web-shell.ts";
import type { GroupOrganizationGroupResponse } from "../../shared/api/generated/public-track/types.gen.ts";

type GroupsSectionProps = {
  organizationId: number;
};

const groupColumns = (t: (key: string) => string): DirectoryTableColumn[] => [
  { key: "name", label: t("teams"), width: "minmax(0,1fr)" },
  { key: "members", label: t("membersColumn"), width: "100px" },
  { key: "workspaces", label: t("workspacesColumn"), width: "100px" },
  { key: "actions", label: "", width: "42px", align: "end" },
];

export function GroupsSection({ organizationId }: GroupsSectionProps): ReactElement {
  const { t } = useTranslation("groups");
  const groupsQuery = useOrgGroupsQuery(organizationId);
  const createMutation = useCreateOrgGroupMutation(organizationId);
  const renameMutation = useRenameOrgGroupMutation(organizationId);
  const deleteMutation = useDeleteOrgGroupMutation(organizationId);
  const updateMutation = useUpdateOrgGroupMutation(organizationId);
  const [groupName, setGroupName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(new Set());
  const [managingGroup, setManagingGroup] = useState<GroupOrganizationGroupResponse | null>(null);

  const groups: GroupOrganizationGroupResponse[] = Array.isArray(groupsQuery.data)
    ? groupsQuery.data
    : [];

  if (groupsQuery.isPending) {
    return <DirectorySurfaceMessage message={t("loadingGroups")} />;
  }

  if (groupsQuery.isError) {
    return <DirectorySurfaceMessage message={t("unableToLoadGroups")} tone="error" />;
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = groupName.trim();
    if (trimmed.length === 0) return;

    void createMutation
      .mutateAsync({ name: trimmed })
      .then(() => {
        setGroupName("");
        toast.success(t("teamCreated"));
      })
      .catch((err) =>
        toast.error(err instanceof WebApiError ? err.userMessage : t("couldNotCreateTeam")),
      );
  }

  function handleRename(groupId: number, name: string) {
    void renameMutation
      .mutateAsync({ groupId, name })
      .then(() => toast.success(t("renamed")))
      .catch((err) =>
        toast.error(err instanceof WebApiError ? err.userMessage : t("couldNotRenameTeam")),
      );
  }

  function handleDelete(groupId: number) {
    void deleteMutation
      .mutateAsync(groupId)
      .then(() => toast.success(t("deleted")))
      .catch((err) =>
        toast.error(err instanceof WebApiError ? err.userMessage : t("couldNotDeleteTeam")),
      );
  }

  function handleAddMember(group: GroupOrganizationGroupResponse, userId: number) {
    const currentUserIds = (group.users ?? []).map((u) => u.user_id!);
    const newUsers = [...currentUserIds, userId];
    void updateMutation
      .mutateAsync({
        groupId: group.group_id!,
        payload: { name: group.name, users: newUsers },
      })
      .then(() => toast.success(t("memberAdded")))
      .catch((err) =>
        toast.error(err instanceof WebApiError ? err.userMessage : t("couldNotAddMember")),
      );
  }

  function handleRemoveMember(group: GroupOrganizationGroupResponse, userId: number) {
    const newUsers = (group.users ?? []).map((u) => u.user_id!).filter((id) => id !== userId);
    void updateMutation
      .mutateAsync({
        groupId: group.group_id!,
        payload: { name: group.name, users: newUsers },
      })
      .then(() => toast.success(t("memberRemoved")))
      .catch((err) =>
        toast.error(err instanceof WebApiError ? err.userMessage : t("couldNotRemoveMember")),
      );
  }

  function toggleExpand(id: number | string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full min-w-0 text-white" data-testid="groups-section">
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-[var(--track-text-muted)]">
          {t("teamName")}
          <input
            className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white"
            onChange={(event) => setGroupName(event.target.value)}
            value={groupName}
          />
        </label>
        <AppButton
          disabled={groupName.trim().length === 0 || createMutation.isPending}
          type="submit"
        >
          <PlusIcon className="size-3.5" />
          {t("createTeam")}
        </AppButton>
      </form>

      <DirectoryTable
        columns={groupColumns(t)}
        data-testid="groups-list"
        emptyIcon={<MembersIcon className="size-5" />}
        emptyTitle={t("noTeamsYet")}
        emptyDescription={t("noTeamsDescription")}
        expandable
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        renderExpandedContent={(group) => {
          const members = group.users ?? [];
          if (members.length === 0) {
            return (
              <div className="py-3 text-[12px] text-[var(--track-text-muted)]">
                {t("noMembersInTeam")}
                <button
                  className="ml-2 text-[var(--track-accent-text)] hover:underline"
                  onClick={() => setManagingGroup(group)}
                  type="button"
                >
                  {t("addMember")}
                </button>
              </div>
            );
          }
          return (
            <div className="py-1">
              {members.map((user) => (
                <div className="flex h-[36px] items-center gap-2" key={user.user_id}>
                  <span className="flex size-5 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[9px] font-semibold uppercase text-[var(--track-text-muted)]">
                    {(user.name ?? "?").charAt(0)}
                  </span>
                  <span className="truncate text-[13px] text-white">{user.name ?? "—"}</span>
                  {user.inactive ? (
                    <span className="rounded-[4px] bg-rose-900/40 px-1.5 text-[10px] text-rose-400">
                      inactive
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          );
        }}
        renderRow={(group) => (
          <>
            <div className="flex h-[44px] items-center gap-2">
              <span className="truncate text-white">{group.name}</span>
              <DirectoryTableRenderCountBadge />
            </div>
            <div className="flex h-[44px] items-center text-[12px] text-[var(--track-text-muted)]">
              {group.users?.length ?? 0}
            </div>
            <div className="flex h-[44px] items-center text-[12px] text-[var(--track-text-muted)]">
              {group.workspaces?.length ?? 0}
            </div>
            <div className="flex h-[44px] items-center justify-end">
              <GroupRowActions
                group={group}
                onDelete={() => handleDelete(group.group_id!)}
                onManageMembers={() => setManagingGroup(group)}
                onRename={(name) => handleRename(group.group_id!, name)}
                t={t}
              />
            </div>
          </>
        )}
        footer={<span>{t("showingTeams", { count: groups.length })}</span>}
        isLoading={false}
        rowKey={(group) => group.group_id ?? 0}
        rows={groups}
      />

      {managingGroup ? (
        <ManageMembersDialog
          group={managingGroup}
          organizationId={organizationId}
          onAddMember={(userId) => handleAddMember(managingGroup, userId)}
          onRemoveMember={(userId) => handleRemoveMember(managingGroup, userId)}
          onClose={() => setManagingGroup(null)}
          t={t}
        />
      ) : null}
    </div>
  );
}

function GroupRowActions({
  group,
  onDelete,
  onManageMembers,
  onRename,
  t,
}: {
  group: GroupOrganizationGroupResponse;
  onDelete: () => void;
  onManageMembers: () => void;
  onRename: (name: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(group.name ?? "");

  if (editing) {
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = editValue.trim();
          if (trimmed && trimmed !== group.name) {
            onRename(trimmed);
          }
          setEditing(false);
        }}
      >
        <input
          autoFocus
          className="h-6 w-[160px] rounded-[4px] border border-[var(--track-accent-soft)] bg-[var(--track-surface-muted)] px-2 text-[12px] text-white outline-none"
          onBlur={() => setEditing(false)}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          value={editValue}
        />
      </form>
    );
  }

  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={`Actions for ${group.name}`} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
      minWidth="160px"
    >
      <GroupMenuContent
        groupName={group.name ?? ""}
        onDelete={onDelete}
        onManageMembers={onManageMembers}
        onStartEditing={() => {
          setEditValue(group.name ?? "");
          setEditing(true);
        }}
        t={t}
      />
    </DropdownMenu>
  );
}

function GroupMenuContent({
  groupName,
  onDelete,
  onManageMembers,
  onStartEditing,
  t,
}: {
  groupName: string;
  onDelete: () => void;
  onManageMembers: () => void;
  onStartEditing: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactNode {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = useDropdownClose();

  if (confirmingDelete) {
    return (
      <div className="px-3 py-2">
        <p className="mb-2 text-[12px] text-[var(--track-text-muted)]">
          {t("confirmDeleteTeam", { name: groupName })}
        </p>
        <div className="flex gap-2">
          <AppButton
            onClick={() => {
              onDelete();
              close();
            }}
            size="sm"
            danger
          >
            {t("deleteTeam")}
          </AppButton>
          <AppButton onClick={() => setConfirmingDelete(false)} size="sm">
            {t("cancel")}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        onClick={() => {
          onManageMembers();
          close();
        }}
        type="button"
      >
        {t("manageMembers")}
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
        onClick={() => {
          close();
          onStartEditing();
        }}
        type="button"
      >
        {t("renameTeam")}
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-rose-400 hover:bg-[var(--track-surface-muted)]"
        onClick={() => setConfirmingDelete(true)}
        type="button"
      >
        {t("deleteTeam")}
      </button>
    </>
  );
}

function ManageMembersDialog({
  group,
  organizationId,
  onAddMember,
  onRemoveMember,
  onClose,
  t,
}: {
  group: GroupOrganizationGroupResponse;
  organizationId: number;
  onAddMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactElement {
  const orgMembersQuery = useOrganizationMembersQuery(organizationId);
  const [search, setSearch] = useState("");

  const currentUserIds = new Set(group.users?.map((u) => u.user_id) ?? []);

  const orgMembersMap = (() => {
    const map = new Map<number, { name: string; email: string }>();
    const allMembers = Array.isArray(orgMembersQuery.data) ? orgMembersQuery.data : [];
    for (const m of allMembers) {
      if (m.user_id != null) {
        map.set(m.user_id, { name: m.name ?? "", email: m.email ?? "" });
      }
    }
    return map;
  })();

  const currentMembers = (() => {
    return (group.users ?? []).map((u) => {
      const details = orgMembersMap.get(u.user_id!);
      return {
        user_id: u.user_id!,
        name: details?.name || u.name || "",
        email: details?.email || "",
      };
    });
  })();

  const availableMembers = (() => {
    const allMembers = Array.isArray(orgMembersQuery.data) ? orgMembersQuery.data : [];
    return allMembers.filter((m) => {
      if (currentUserIds.has(m.user_id)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  })();

  return (
    <Dialog onClose={onClose} width="max-w-[480px]">
      <DialogHeader onClose={onClose} title={`${t("manageMembers")} — ${group.name ?? ""}`} />
      <DialogBody>
        <div className="space-y-4">
          {/* Current members */}
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              {currentMembers.length > 0
                ? t("members", { count: currentMembers.length })
                : t("noMembersInTeam")}
            </h3>
            {currentMembers.length > 0 ? (
              <ul className="divide-y divide-white/8">
                {currentMembers.map((user) => (
                  <li key={user.user_id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold uppercase text-[var(--track-text-muted)]">
                        {(user.name || "?").charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[13px] text-white">
                          {user.name || "—"}
                        </span>
                        {user.email ? (
                          <span className="block truncate text-[11px] text-[var(--track-text-muted)]">
                            {user.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-md px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-900/30"
                      onClick={() => onRemoveMember(user.user_id)}
                      type="button"
                    >
                      {t("removeMember")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Add members */}
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              {t("addMember")}
            </h3>
            <input
              className="mb-2 h-9 w-full rounded-lg border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-3 text-sm text-white outline-none focus:border-[var(--track-accent)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchOrgMembers")}
              type="text"
              value={search}
            />
            {orgMembersQuery.isPending ? (
              <p className="py-2 text-[12px] text-[var(--track-text-muted)]">Loading…</p>
            ) : availableMembers.length > 0 ? (
              <ul className="max-h-[200px] divide-y divide-white/8 overflow-y-auto">
                {availableMembers.map((member) => (
                  <li
                    key={member.user_id ?? member.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold uppercase text-[var(--track-text-muted)]">
                        {(member.name ?? "?").charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[13px] text-white">
                          {member.name ?? "—"}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--track-text-muted)]">
                          {member.email ?? ""}
                        </span>
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-md bg-[var(--track-surface-muted)] px-2.5 py-1 text-[11px] text-white hover:bg-[var(--track-accent)]"
                      onClick={() => onAddMember(member.user_id!)}
                      type="button"
                    >
                      {t("addMember")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-[12px] text-[var(--track-text-muted)]">
                {t("selectMembersToAdd")}
              </p>
            )}
          </div>
        </div>
      </DialogBody>
    </Dialog>
  );
}
