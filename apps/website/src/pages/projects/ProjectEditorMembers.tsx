import { type ChangeEvent, type ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SelectDropdown } from "@opentoggl/web-ui";

import type { ProjectEditorMember } from "./ProjectEditorDialog.tsx";

type ProjectEditorMembersProps = {
  memberRole: "manager" | "regular";
  members: ProjectEditorMember[];
  onMemberRoleChange: (value: "manager" | "regular") => void;
  onToggleMember: (memberId: number) => void;
  selectedMemberIds: number[];
};

export function ProjectEditorMembers({
  memberRole,
  members,
  onMemberRoleChange,
  onToggleMember,
  selectedMemberIds,
}: ProjectEditorMembersProps): ReactElement {
  const { t } = useTranslation("projects");
  const [memberQuery, setMemberQuery] = useState("");
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const haystack = `${member.name} ${member.email ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [memberQuery, members]);

  return (
    <section className="rounded-lg border border-[var(--track-border)] bg-[var(--track-input-bg)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {t("manageProjectMembers")}
          </p>
          <p className="mt-1 text-[14px] text-white">{t("inviteMembers")}</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-[var(--track-overlay-text)]">
          <span>{t("access")}</span>
          <SelectDropdown
            aria-label={t("memberAccess")}
            onChange={(value) => onMemberRoleChange(value === "manager" ? "manager" : "regular")}
            options={[
              { label: t("regularMember"), value: "regular" },
              { label: t("projectManager"), value: "manager" },
            ]}
            value={memberRole}
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="sr-only">{t("inviteMembers")}</span>
        <input
          aria-label={t("inviteMembers")}
          className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setMemberQuery(event.target.value)}
          placeholder={t("typeNameOrEmailToInvite")}
          value={memberQuery}
        />
      </label>
      <div className="mt-3 max-h-[180px] space-y-1 overflow-y-auto pr-1">
        {filteredMembers.map((member) => {
          const selected = selectedMemberIds.includes(member.id);
          return (
            <button
              aria-pressed={selected}
              className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left transition ${
                selected
                  ? "border-[var(--track-accent-soft)] bg-[var(--track-accent-soft)]/10 text-white"
                  : "border-transparent bg-[var(--track-control-surface-muted)] text-[var(--track-overlay-text-muted)] hover:border-white/10"
              }`}
              key={member.id}
              onClick={() => onToggleMember(member.id)}
              type="button"
            >
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{member.name}</div>
                <div className="truncate text-[12px] text-[var(--track-text-muted)]">
                  {member.email ?? t("workspaceMember")}
                </div>
              </div>
              <span className="text-[12px]">{selected ? t("added") : t("add")}</span>
            </button>
          );
        })}
        {filteredMembers.length === 0 ? (
          <p className="rounded-[10px] bg-[var(--track-control-surface-muted)] px-3 py-3 text-[12px] text-[var(--track-text-muted)]">
            {t("noMatchingWorkspaceMembers")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
