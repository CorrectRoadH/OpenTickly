import { type ReactElement, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postTimesheetSetups } from "../../shared/api/public/track/index.ts";
import type { ModelsSimpleWorkspaceUser } from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useWorkspaceUsersQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type TimesheetSetupDialogProps = {
  onClose: () => void;
};

export function TimesheetSetupDialog({ onClose }: TimesheetSetupDialogProps): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const currentUserId = session.user.id ?? 0;

  const usersQuery = useWorkspaceUsersQuery(workspaceId);
  const queryClient = useQueryClient();

  const members: MemberOption[] = useMemo(() => {
    return (usersQuery.data ?? [])
      .filter((u) => u.id != null && u.inactive !== true)
      .map((u) => ({
        id: u.id as number,
        name: formatMemberName(u, currentUserId),
      }));
  }, [usersQuery.data, currentUserId]);

  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [periodicity, setPeriodicity] = useState("weekly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [approverDropdownOpen, setApproverDropdownOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, memberSearch]);

  const createMutation = useMutation({
    mutationFn: () =>
      unwrapWebApiResult(
        postTimesheetSetups({
          path: { workspace_id: workspaceId },
          body: {
            member_ids: [...selectedMemberIds],
            approver_ids: approverIds.length > 0 ? approverIds : undefined,
            periodicity,
            start_date: startDate,
            email_reminder_enabled: reminderEnabled,
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals", "setups"] });
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      onClose();
    },
  });

  function toggleMember(id: number) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllMembers() {
    setSelectedMemberIds(new Set(members.map((m) => m.id)));
  }

  function selectNoneMembers() {
    setSelectedMemberIds(new Set());
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-[var(--track-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--track-border)] px-6 py-5">
          <h1 className="text-[18px] font-semibold text-white">Set up timesheets for members</h1>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-6 text-[13px] leading-5 text-[var(--track-text-muted)]">
            Timesheet setup allows automatic timesheet creation from tracked time. Each period,
            members can review and submit their timesheets, which assigned approvers can then review
            and approve.
          </p>

          {/* Members */}
          <FieldLabel>Members</FieldLabel>
          <div className="relative mb-5">
            <button
              className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
              onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
              type="button"
            >
              <span
                className={
                  selectedMemberIds.size > 0 ? "text-white" : "text-[var(--track-text-muted)]"
                }
              >
                {selectedMemberIds.size > 0
                  ? `${selectedMemberIds.size} member${selectedMemberIds.size > 1 ? "s" : ""} selected`
                  : "Select member(s)"}
              </span>
              <ChevronDown />
            </button>
            {memberDropdownOpen ? (
              <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-tooltip-surface,var(--track-surface))] shadow-lg">
                <div className="flex items-center gap-2 border-b border-[var(--track-border)] px-3 py-2">
                  <SearchIcon />
                  <input
                    className="flex-1 bg-transparent text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Find members"
                    type="text"
                    value={memberSearch}
                  />
                </div>
                <div className="flex items-center gap-3 border-b border-[var(--track-border)] px-3 py-1.5 text-[11px]">
                  <span className="text-[var(--track-text-muted)]">Active Users</span>
                  <button
                    className="text-[var(--track-accent)] hover:underline"
                    onClick={selectAllMembers}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className="text-[var(--track-accent)] hover:underline"
                    onClick={selectNoneMembers}
                    type="button"
                  >
                    None
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto py-1">
                  {filteredMembers.map((m) => (
                    <label
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--track-row-hover)]"
                      key={m.id}
                    >
                      <input
                        checked={selectedMemberIds.has(m.id)}
                        className="accent-[var(--track-accent)]"
                        onChange={() => toggleMember(m.id)}
                        type="checkbox"
                      />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[10px] font-semibold text-[var(--track-accent)]">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-[13px] text-white">{m.name}</span>
                    </label>
                  ))}
                  {filteredMembers.length === 0 ? (
                    <div className="px-3 py-3 text-center text-[12px] text-[var(--track-text-muted)]">
                      No members found
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Approver */}
          <FieldLabel>Approver(s) Level 1</FieldLabel>
          <div className="relative mb-5">
            <button
              className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
              onClick={() => setApproverDropdownOpen(!approverDropdownOpen)}
              type="button"
            >
              <span
                className={approverIds.length > 0 ? "text-white" : "text-[var(--track-text-muted)]"}
              >
                {approverIds.length > 0
                  ? (members.find((m) => m.id === approverIds[0])?.name ?? "Selected")
                  : "Select timesheet approver"}
              </span>
              <ChevronDown />
            </button>
            {approverDropdownOpen ? (
              <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-tooltip-surface,var(--track-surface))] shadow-lg">
                <div className="max-h-[200px] overflow-y-auto py-1">
                  {members.map((m) => (
                    <button
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[var(--track-row-hover)] ${
                        approverIds.includes(m.id) ? "bg-[var(--track-row-hover)]" : ""
                      }`}
                      key={m.id}
                      onClick={() => {
                        setApproverIds([m.id]);
                        setApproverDropdownOpen(false);
                      }}
                      type="button"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[10px] font-semibold text-[var(--track-accent)]">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-[13px] text-white">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Period */}
          <FieldLabel>Period</FieldLabel>
          <div className="mb-5 flex items-center gap-3">
            <select
              className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
              onChange={(e) => setPeriodicity(e.target.value)}
              value={periodicity}
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--track-text-muted)]">Starting from</span>
              <input
                className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                value={startDate}
              />
            </div>
          </div>

          {/* Reminder */}
          <label className="mb-5 flex cursor-pointer items-center gap-2.5">
            <input
              checked={reminderEnabled}
              className="accent-[var(--track-accent)]"
              onChange={(e) => setReminderEnabled(e.target.checked)}
              type="checkbox"
            />
            <span className="text-[13px] text-white">Remind members to submit their timesheet</span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--track-border)] px-6 py-4">
          <button
            className="h-9 w-full rounded-[8px] bg-[var(--track-accent)] text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            disabled={selectedMemberIds.size === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            type="button"
          >
            {createMutation.isPending ? "Setting up..." : "Set up timesheet(s)"}
          </button>
          {createMutation.isError ? (
            <p className="mt-2 text-center text-[12px] text-[#ef4444]">
              Failed to create timesheet setup. Try again.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

type MemberOption = {
  id: number;
  name: string;
};

function formatMemberName(user: ModelsSimpleWorkspaceUser, currentUserId: number): string {
  const name = user.fullname?.trim() || user.email?.trim() || `User ${user.id}`;
  return user.id === currentUserId ? `${name} (You)` : name;
}

function FieldLabel({ children }: { children: string }): ReactElement {
  return (
    <div className="mb-1.5 text-[11px] font-medium text-[var(--track-text-muted)]">{children}</div>
  );
}

function ChevronDown(): ReactElement {
  return (
    <svg
      className="h-3 w-3 text-[var(--track-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[var(--track-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  );
}
