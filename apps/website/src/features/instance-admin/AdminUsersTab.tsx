import { AppSurfaceState, SelectField, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";

import {
  useDisableInstanceUserMutation,
  useInstanceUsersQuery,
  useRestoreInstanceUserMutation,
} from "../../shared/query/instance-admin.ts";
import type { InstanceUser } from "../../shared/api/generated/admin/types.gen.ts";

export function AdminUsersTab(): ReactElement {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [search, setSearch] = useState("");
  const usersQuery = useInstanceUsersQuery({ status: statusFilter, query: search || undefined });
  const disableMutation = useDisableInstanceUserMutation();
  const restoreMutation = useRestoreInstanceUserMutation();

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard>
        <div className="flex items-center gap-3 p-4">
          <input
            className="flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            type="text"
            value={search}
          />
          <SelectField
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "disabled")}
            value={statusFilter}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </SelectField>
        </div>
      </SurfaceCard>

      {usersQuery.isPending ? (
        <SurfaceCard>
          <AppSurfaceState
            className="border-none bg-transparent text-[var(--track-text-muted)]"
            description="Loading users..."
            title="Users"
            tone="loading"
          />
        </SurfaceCard>
      ) : null}

      {usersQuery.isError ? (
        <SurfaceCard>
          <AppSurfaceState
            className="border-none bg-transparent text-[var(--track-text-muted)]"
            description="Could not load instance users."
            title="Users unavailable"
            tone="error"
          />
        </SurfaceCard>
      ) : null}

      {usersQuery.data ? (
        <SurfaceCard>
          <div className="p-4">
            <div className="mb-3 text-[12px] text-[var(--track-text-muted)]">
              {usersQuery.data.total_count} user{usersQuery.data.total_count !== 1 ? "s" : ""}
            </div>
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--track-border)] text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Admin</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.users.map((user) => (
                  <UserRow
                    key={user.id}
                    onDisable={() => {
                      disableMutation.mutate(user.id, {
                        onSuccess: () => toast.success(`${user.email} disabled`),
                        onError: () => toast.error("Failed to disable user"),
                      });
                    }}
                    onRestore={() => {
                      restoreMutation.mutate(user.id, {
                        onSuccess: () => toast.success(`${user.email} restored`),
                        onError: () => toast.error("Failed to restore user"),
                      });
                    }}
                    user={user}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

function UserRow({
  user,
  onDisable,
  onRestore,
}: {
  user: InstanceUser;
  onDisable: () => void;
  onRestore: () => void;
}): ReactElement {
  return (
    <tr className="border-b border-[var(--track-border)] last:border-0">
      <td className="py-3 pr-4 text-[var(--track-text)]">{user.email}</td>
      <td className="py-3 pr-4 text-[var(--track-text-soft)]">{user.name ?? "-"}</td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${
            user.status === "active"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {user.status}
        </span>
      </td>
      <td className="py-3 pr-4 text-[var(--track-text-soft)]">
        {user.is_instance_admin ? "Yes" : "-"}
      </td>
      <td className="py-3 pr-4 text-[12px] text-[var(--track-text-muted)]">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 text-right">
        {user.status === "active" && !user.is_instance_admin ? (
          <button
            className="rounded-[6px] px-3 py-1 text-[12px] text-red-400 hover:bg-red-500/10"
            onClick={onDisable}
            type="button"
          >
            Disable
          </button>
        ) : null}
        {user.status === "disabled" ? (
          <button
            className="rounded-[6px] px-3 py-1 text-[12px] text-green-400 hover:bg-green-500/10"
            onClick={onRestore}
            type="button"
          >
            Restore
          </button>
        ) : null}
      </td>
    </tr>
  );
}
