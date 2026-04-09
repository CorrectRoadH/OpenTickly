import { type ReactElement, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AppInput,
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  SelectDropdown,
} from "@opentoggl/web-ui";

import { SearchIcon } from "../../shared/ui/icons.tsx";
import {
  useOrganizationMembersQuery,
  useUpdateOrganizationUserMutation,
} from "../../shared/query/web-shell.ts";
import type { ModelsOrgUser } from "../../shared/api/generated/public-track/types.gen.ts";

type MemberStatusFilter = "all" | "active" | "inactive" | "invited";

function resolveOrgMemberStatus(member: ModelsOrgUser): string {
  if (!member.joined && member.invitation_id) return "invited";
  if (member.inactive) return "inactive";
  return "active";
}

function resolveOrgMemberStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case "active":
      return t("active");
    case "inactive":
      return t("disabled");
    case "invited":
      return t("invited");
    default:
      return status;
  }
}

function resolveOrgMemberRole(member: ModelsOrgUser): string {
  if (member.owner) return "owner";
  if (member.admin) return "admin";
  return "member";
}

const memberColumns = (t: (key: string) => string): DirectoryTableColumn[] => [
  { key: "avatar", label: "", width: "42px" },
  { key: "name", label: t("name"), width: "minmax(0,2fr)" },
  { key: "role", label: t("role"), width: "100px" },
  { key: "workspaces", label: t("workspaces"), width: "100px" },
  { key: "status", label: t("status"), width: "100px" },
];

type OrganizationMembersSectionProps = {
  organizationId: number;
};

const roleOptions = (t: (key: string) => string) => [
  { value: "admin", label: t("admin") },
  { value: "member", label: t("member") },
];

export function OrganizationMembersSection({
  organizationId,
}: OrganizationMembersSectionProps): ReactElement {
  const { t } = useTranslation("members");
  const membersQuery = useOrganizationMembersQuery(organizationId);
  const updateUserMutation = useUpdateOrganizationUserMutation(organizationId);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [search, setSearch] = useState("");

  const members = (() => {
    if (!Array.isArray(membersQuery.data)) return [];
    return membersQuery.data;
  })();

  const filteredMembers = (() => {
    return members.filter((member) => {
      const status = resolveOrgMemberStatus(member);
      if (statusFilter === "active" && status !== "active") return false;
      if (statusFilter === "inactive" && status !== "inactive") return false;
      if (statusFilter === "invited" && status !== "invited") return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (member.name ?? "").toLowerCase().includes(q) ||
          (member.email ?? "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  })();

  const activeCount = members.filter((m) => resolveOrgMemberStatus(m) === "active").length;
  const inactiveCount = members.filter((m) => resolveOrgMemberStatus(m) === "inactive").length;
  const invitedCount = members.filter((m) => resolveOrgMemberStatus(m) === "invited").length;

  function handleRoleChange(member: ModelsOrgUser, newRole: string) {
    const userId = member.user_id ?? member.id;
    if (userId == null) return;

    void updateUserMutation
      .mutateAsync({
        organizationUserId: userId,
        payload: { organization_admin: newRole === "admin" },
      })
      .then(() => toast.success(t("roleUpdated")))
      .catch(() => toast.error(t("couldNotUpdateRole")));
  }

  function renderMemberRow(member: ModelsOrgUser): ReactNode {
    const status = resolveOrgMemberStatus(member);
    const role = resolveOrgMemberRole(member);
    const isOwner = member.owner === true;

    return (
      <>
        <div className="flex h-[54px] items-center">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--track-surface-muted)] text-[10px] font-semibold uppercase text-[var(--track-text-muted)]">
            {(member.name ?? "?").charAt(0)}
          </span>
        </div>
        <div className="flex h-[54px] flex-col justify-center overflow-hidden">
          <span className="truncate text-[12px] text-white">{member.name ?? "—"}</span>
          <span className="truncate text-[11px] text-[var(--track-text-muted)]">
            {member.email ?? "—"}
          </span>
        </div>
        <div className="flex h-[54px] items-center">
          {isOwner ? (
            <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              owner
            </span>
          ) : (
            <SelectDropdown
              aria-label={`Role for ${member.name}`}
              onChange={(value) => handleRoleChange(member, value)}
              options={roleOptions(t)}
              value={role}
            />
          )}
        </div>
        <div className="flex h-[54px] items-center text-[11px] text-[var(--track-text-muted)]">
          {member.workspace_count ?? 0}
        </div>
        <div className="flex h-[54px] items-center">
          <span
            className={`inline-flex h-5 items-center rounded-[4px] px-1.5 text-[10px] font-medium uppercase tracking-[0.04em] ${
              status === "active"
                ? "bg-emerald-900/40 text-emerald-400"
                : status === "inactive"
                  ? "bg-rose-900/40 text-rose-400"
                  : "bg-amber-900/40 text-amber-400"
            }`}
          >
            {resolveOrgMemberStatusLabel(status, t)}
          </span>
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
    <div className="w-full min-w-0 text-white" data-testid="org-members-section">
      <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="org-members-filter-bar">
        <SelectDropdown
          aria-label={t("memberStatusFilter")}
          onChange={(v) => setStatusFilter(v as MemberStatusFilter)}
          options={[
            { value: "all", label: t("allMembers") },
            { value: "active", label: t("active") },
            { value: "inactive", label: t("disabled") },
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
      </div>

      <DirectoryTable
        columns={memberColumns(t)}
        data-testid="org-members-list"
        emptyState={
          search.trim()
            ? "No members match your search."
            : statusFilter !== "all"
              ? `No ${statusFilter} members.`
              : "No members in this organization yet."
        }
        footer={
          <span data-testid="org-members-summary">
            {members.length} member{members.length === 1 ? "" : "s"}. Active: {activeCount} ·
            Inactive: {inactiveCount} · Invited: {invitedCount}
          </span>
        }
        isLoading={false}
        renderRow={renderMemberRow}
        rowKey={(member) => member.id ?? member.user_id ?? 0}
        rows={filteredMembers}
      />
    </div>
  );
}
