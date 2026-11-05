import {
  AppButton,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  DirectoryTableRenderCountBadge,
} from "@opentickly/web-ui";
import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { WebApiError } from "../../shared/api/web-client.ts";
import { MembersIcon, PlusIcon } from "../../shared/ui/icons.tsx";
import {
  useOrgGroupsQuery,
  useCreateOrgGroupMutation,
  useRenameOrgGroupMutation,
  useDeleteOrgGroupMutation,
  useUpdateOrgGroupMutation,
} from "../../shared/query/web-shell.ts";
import type { GroupOrganizationGroupResponse } from "../../shared/api/generated/public-track/types.gen.ts";

import { GroupRowActions } from "./GroupRowActions.tsx";
import { ManageMembersDialog } from "./ManageMembersDialog.tsx";

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
  const [managingGroupId, setManagingGroupId] = useState<number | null>(null);

  const groups: GroupOrganizationGroupResponse[] = Array.isArray(groupsQuery.data)
    ? groupsQuery.data
    : [];
  const managingGroup = groups.find((group) => group.group_id === managingGroupId);

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
                  onClick={() => setManagingGroupId(group.group_id!)}
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
                onManageMembers={() => setManagingGroupId(group.group_id!)}
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
          isPending={updateMutation.isPending}
          organizationId={organizationId}
          onAddMember={(userId) => handleAddMember(managingGroup, userId)}
          onRemoveMember={(userId) => handleRemoveMember(managingGroup, userId)}
          onClose={() => setManagingGroupId(null)}
          t={t}
        />
      ) : null}
    </div>
  );
}
