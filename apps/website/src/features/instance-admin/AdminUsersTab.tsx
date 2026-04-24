import { AppSurfaceState, SelectDropdown, SurfaceCard } from "@opentickly/web-ui";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import i18n from "../../app/i18n.ts";
import {
  useDisableInstanceUserMutation,
  useInstanceUsersQuery,
  useRestoreInstanceUserMutation,
} from "../../shared/query/instance-admin.ts";
import type { InstanceUser } from "../../shared/api/generated/admin/types.gen.ts";
import { WebApiError } from "../../shared/api/web-client.ts";

export function AdminUsersTab(): ReactElement {
  const { t } = useTranslation();
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
            placeholder={t("instanceAdmin:searchByEmailOrName")}
            type="text"
            value={search}
          />
          <SelectDropdown
            onChange={(value) => setStatusFilter(value as "all" | "active" | "disabled")}
            options={[
              { label: t("instanceAdmin:all"), value: "all" },
              { label: t("instanceAdmin:active"), value: "active" },
              { label: t("instanceAdmin:disabled"), value: "disabled" },
            ]}
            value={statusFilter}
          />
        </div>
      </SurfaceCard>

      {usersQuery.isPending ? (
        <SurfaceCard>
          <AppSurfaceState
            className="border-none bg-transparent text-[var(--track-text-muted)]"
            description={t("instanceAdmin:loadingUsers")}
            title={t("instanceAdmin:users")}
            tone="loading"
          />
        </SurfaceCard>
      ) : null}

      {usersQuery.isError ? (
        <SurfaceCard>
          <AppSurfaceState
            className="border-none bg-transparent text-[var(--track-text-muted)]"
            description={t("instanceAdmin:couldNotLoadUsers")}
            title={t("instanceAdmin:usersUnavailable")}
            tone="error"
          />
        </SurfaceCard>
      ) : null}

      {usersQuery.data ? (
        <SurfaceCard>
          <div className="p-4">
            <div className="mb-3 text-[12px] text-[var(--track-text-muted)]">
              {usersQuery.data.total_count}{" "}
              {t("instanceAdmin:usersCount", { count: usersQuery.data.total_count })}
            </div>
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--track-border)] text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
                  <th className="pb-2 pr-4">{t("instanceAdmin:email")}</th>
                  <th className="pb-2 pr-4">{t("instanceAdmin:name")}</th>
                  <th className="pb-2 pr-4">{t("instanceAdmin:status")}</th>
                  <th className="pb-2 pr-4">{t("instanceAdmin:admin")}</th>
                  <th className="pb-2 pr-4">{t("instanceAdmin:created")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.users.map((user) => (
                  <UserRow
                    key={user.id}
                    onDisable={() => {
                      disableMutation.mutate(user.id, {
                        onSuccess: () =>
                          toast.success(t("toast:userDisabled", { email: user.email })),
                        onError: (err) =>
                          toast.error(
                            err instanceof WebApiError
                              ? err.userMessage
                              : t("toast:failedToDisableUser"),
                          ),
                      });
                    }}
                    onRestore={() => {
                      restoreMutation.mutate(user.id, {
                        onSuccess: () =>
                          toast.success(t("toast:userRestored", { email: user.email })),
                        onError: (err) =>
                          toast.error(
                            err instanceof WebApiError
                              ? err.userMessage
                              : t("toast:failedToRestoreUser"),
                          ),
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
  const { t } = useTranslation();

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
          {t(`instanceAdmin:${user.status}`)}
        </span>
      </td>
      <td className="py-3 pr-4 text-[var(--track-text-soft)]">
        {user.is_instance_admin ? t("instanceAdmin:yes") : "-"}
      </td>
      <td className="py-3 pr-4 text-[12px] text-[var(--track-text-muted)]">
        {new Date(user.created_at).toLocaleDateString(i18n.language)}
      </td>
      <td className="py-3 text-right">
        {user.status === "active" && !user.is_instance_admin ? (
          <button
            className="rounded-[6px] px-3 py-1 text-[12px] text-red-400 hover:bg-red-500/10"
            onClick={onDisable}
            type="button"
          >
            {t("instanceAdmin:disable")}
          </button>
        ) : null}
        {user.status === "disabled" ? (
          <button
            className="rounded-[6px] px-3 py-1 text-[12px] text-green-400 hover:bg-green-500/10"
            onClick={onRestore}
            type="button"
          >
            {t("instanceAdmin:restore")}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
