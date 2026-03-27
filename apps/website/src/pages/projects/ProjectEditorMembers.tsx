import { type ChangeEvent, type ReactElement, useMemo, useState } from "react";

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
    <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            Manage project members
          </p>
          <p className="mt-2 text-[14px] text-white">Invite members</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#d4d4d9]">
          <span>Access</span>
          <select
            aria-label="Member access"
            className="h-9 rounded-md border border-[var(--track-border)] bg-[#262628] px-3 text-[13px] text-white"
            onChange={(event) =>
              onMemberRoleChange(event.target.value === "manager" ? "manager" : "regular")
            }
            value={memberRole}
          >
            <option value="regular">Regular member</option>
            <option value="manager">Project manager</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Invite members</span>
        <input
          aria-label="Invite members"
          className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[#262628] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setMemberQuery(event.target.value)}
          placeholder="Type a name or email to invite"
          value={memberQuery}
        />
      </label>
      <div className="mt-4 max-h-[180px] space-y-2 overflow-y-auto pr-1">
        {filteredMembers.map((member) => {
          const selected = selectedMemberIds.includes(member.id);
          return (
            <button
              aria-pressed={selected}
              className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left transition ${
                selected
                  ? "border-[var(--track-accent-soft)] bg-[var(--track-accent-soft)]/10 text-white"
                  : "border-transparent bg-[#232325] text-[#d0d0d4] hover:border-white/10"
              }`}
              key={member.id}
              onClick={() => onToggleMember(member.id)}
              type="button"
            >
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{member.name}</div>
                <div className="truncate text-[12px] text-[var(--track-text-muted)]">
                  {member.email ?? "Workspace member"}
                </div>
              </div>
              <span className="text-[12px]">{selected ? "Added" : "Add"}</span>
            </button>
          );
        })}
        {filteredMembers.length === 0 ? (
          <p className="rounded-[10px] bg-[#232325] px-3 py-3 text-[13px] text-[var(--track-text-muted)]">
            No matching workspace members.
          </p>
        ) : null}
      </div>
    </section>
  );
}
