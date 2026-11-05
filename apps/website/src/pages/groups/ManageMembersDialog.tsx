import { Dialog, DialogBody, DialogHeader } from "@opentickly/web-ui";
import { type ReactElement, useState } from "react";
import type { GroupOrganizationGroupResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import { useOrganizationMembersQuery } from "../../shared/query/web-shell.ts";

export function ManageMembersDialog({
  group,
  organizationId,
  onAddMember,
  onRemoveMember,
  onClose,
  isPending,
  t,
}: {
  group: GroupOrganizationGroupResponse;
  organizationId: number;
  onAddMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onClose: () => void;
  isPending: boolean;
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
                      disabled={isPending}
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
                      disabled={isPending}
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
