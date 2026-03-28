import { type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import type { WorkspaceMemberDto } from "../../shared/api/web-contract.ts";
import { useWorkspaceMembersQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type GoalEditorDialogProps = {
  goal?: HandlergoalsApiResponse | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => void;
};

export type GoalFormData = {
  comparison: string;
  endDate: string;
  name: string;
  noEndDate: boolean;
  recurrence: string;
  targetHours: number;
};

const COMPARISON_OPTIONS = [
  { label: "at least", value: "more_than" },
  { label: "less than", value: "less_than" },
];

const RECURRENCE_OPTIONS = [
  { label: "every day", value: "daily" },
  { label: "every week", value: "weekly" },
  { label: "weekdays", value: "daily_workdays" },
];

const ICON_OPTIONS = [
  { label: "Target", value: "target" },
  { label: "Clock", value: "clock" },
  { label: "Star", value: "star" },
  { label: "Heart", value: "heart" },
  { label: "Lightning", value: "lightning" },
];

function targetSecondsToHours(seconds?: number): number {
  if (!seconds) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

function resolveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function GoalEditorDialog({
  goal,
  isPending,
  onClose,
  onSubmit,
}: GoalEditorDialogProps): ReactElement {
  const isEdit = goal != null;
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const membersQuery = useWorkspaceMembersQuery(workspaceId);

  const [name, setName] = useState(goal?.name ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "target");
  const [comparison, setComparison] = useState(goal?.comparison ?? "more_than");
  const [targetHours, setTargetHours] = useState(
    isEdit ? targetSecondsToHours(goal.target_seconds) : 2,
  );
  const [recurrence, setRecurrence] = useState(goal?.recurrence ?? "daily");
  const [endDate, setEndDate] = useState(goal?.end_date ?? "");
  const [noEndDate, setNoEndDate] = useState(!goal?.end_date);
  const [memberOpen, setMemberOpen] = useState(false);
  const [selectedUserId] = useState(goal?.user_id ?? session.user.id ?? 0);

  const members = membersQuery.data?.members ?? [];
  const selectedMember = members.find((m) => m.id === selectedUserId);
  const memberDisplayName =
    selectedMember?.name ?? goal?.user_name ?? session.user.fullName ?? "Me";

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({
      comparison,
      endDate: noEndDate ? "" : endDate,
      name: name.trim(),
      noEndDate,
      recurrence,
      targetHours,
    });
  }

  return (
    <ModalDialog
      onClose={onClose}
      testId="goal-editor-dialog"
      title={isEdit ? "Edit goal" : "Create a goal"}
      width="max-w-[520px]"
    >
        <div className="flex flex-col gap-5">
          {/* GOAL */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Goal
            </label>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="h-[42px] flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent-soft)] focus:outline-none"
                data-testid="goal-name-input"
                onChange={(e) => setName(e.target.value)}
                placeholder="Goal name"
                type="text"
                value={name}
              />
              <div className="relative">
                <select
                  aria-label="Goal icon"
                  className="h-[42px] appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-3 pr-8 text-[13px] text-white"
                  data-testid="goal-icon-select"
                  onChange={(e) => setIcon(e.target.value)}
                  value={icon}
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--track-text-muted)]">
                  <TrackingIcon className="size-2.5" name="chevron-down" />
                </span>
              </div>
            </div>
          </div>

          {/* MEMBER */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Member
            </label>
            <div className="relative">
              <button
                className="flex h-[42px] w-full items-center gap-2.5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-left text-[14px] text-white disabled:opacity-60"
                disabled={isEdit}
                onClick={() => !isEdit && setMemberOpen(!memberOpen)}
                type="button"
              >
                <MemberAvatar name={memberDisplayName} />
                <span className="flex-1 truncate">{memberDisplayName}</span>
                <TrackingIcon
                  className="size-2.5 text-[var(--track-text-muted)]"
                  name="chevron-down"
                />
              </button>
              {memberOpen && !isEdit ? (
                <MemberDropdown
                  members={members}
                  onClose={() => setMemberOpen(false)}
                  selectedUserId={selectedUserId}
                />
              ) : null}
            </div>
          </div>

          {/* TRACK */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Track
              <InfoIcon />
            </label>
            <button
              className="flex h-[42px] w-full items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-[var(--track-text-muted)] disabled:opacity-60"
              disabled={isEdit}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="search" />
              <span>Search for projects, tasks, billable...</span>
            </button>
          </div>

          {/* FOR */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              for
              <InfoIcon />
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  className="h-[42px] appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-3 pr-8 text-[14px] text-white disabled:opacity-60"
                  data-testid="goal-comparison-select"
                  disabled={isEdit}
                  onChange={(e) => setComparison(e.target.value)}
                  value={comparison}
                >
                  {COMPARISON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--track-text-muted)]">
                  <TrackingIcon className="size-2.5" name="chevron-down" />
                </span>
              </div>
              <div className="relative">
                <input
                  className="h-[42px] w-20 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-3 pr-12 text-[14px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
                  data-testid="goal-hours-input"
                  min={0}
                  onChange={(e) => setTargetHours(Number(e.target.value) || 0)}
                  type="number"
                  value={targetHours || ""}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-[var(--track-text-muted)]">
                  hours
                </span>
              </div>
              <div className="relative">
                <select
                  className="h-[42px] appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] pl-3 pr-8 text-[14px] text-white disabled:opacity-60 disabled:text-[var(--track-text-muted)]"
                  data-testid="goal-recurrence-select"
                  disabled={isEdit}
                  onChange={(e) => setRecurrence(e.target.value)}
                  value={recurrence}
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--track-text-muted)]">
                  <TrackingIcon className="size-2.5" name="chevron-down" />
                </span>
              </div>
            </div>
          </div>

          {/* UNTIL */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              until
              <InfoIcon />
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative w-48">
                {noEndDate ? (
                  <button
                    className="flex h-[42px] w-full items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white"
                    onClick={() => setNoEndDate(false)}
                    type="button"
                  >
                    <TrackingIcon className="size-3.5" name="calendar" />
                    <span className="flex-1">Indefinite</span>
                    <TrackingIcon
                      className="size-2.5 text-[var(--track-text-muted)]"
                      name="chevron-down"
                    />
                  </button>
                ) : (
                  <input
                    className="h-[42px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
                    data-testid="goal-end-date-input"
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    type="date"
                    value={endDate}
                  />
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white">
                <span
                  className={`flex size-[14px] items-center justify-center rounded-[4px] ${
                    noEndDate
                      ? "bg-[var(--track-accent)]"
                      : "border border-[var(--track-border)] bg-transparent"
                  }`}
                >
                  {noEndDate ? (
                    <svg
                      className="size-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      viewBox="0 0 12 12"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  ) : null}
                </span>
                <input
                  checked={noEndDate}
                  className="sr-only"
                  data-testid="goal-no-end-date-checkbox"
                  onChange={(e) => setNoEndDate(e.target.checked)}
                  type="checkbox"
                />
                No end date
              </label>
            </div>
          </div>

          {/* Note */}
          <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
            Note: you cannot change the projects, tasks, tags, billable or recurrence period of a
            created goal.
          </p>
        </div>

      <div className="mt-5 flex items-center justify-end gap-3">
          <button
            className="h-9 rounded-[8px] px-4 text-[14px] font-semibold text-white hover:bg-[var(--track-row-hover)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-[8px] bg-[var(--track-accent)] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
            data-testid="goal-submit-button"
            disabled={!name.trim() || isPending}
            onClick={handleSubmit}
            type="button"
          >
            {isEdit ? "Edit goal" : "Create goal"}
          </button>
        </div>
    </ModalDialog>
  );
}

function MemberAvatar({ name }: { name: string }): ReactElement {
  const initials = resolveInitials(name);
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e57cd8] text-[10px] font-bold text-black">
      {initials}
    </span>
  );
}

function MemberDropdown({
  members,
  onClose,
  selectedUserId,
}: {
  members: WorkspaceMemberDto[];
  onClose: () => void;
  selectedUserId: number;
}): ReactElement {
  const [search, setSearch] = useState("");
  const activeMembers = members.filter((m) => m.status === "joined" || m.status === "restored");
  const filtered = activeMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-[8px] border border-[var(--track-border)] bg-[#2c2c2e] shadow-lg">
        <div className="border-b border-[var(--track-border)] px-3 py-2">
          <div className="relative">
            <TrackingIcon
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--track-text-muted)]"
              name="search"
            />
            <input
              autoFocus
              className="h-8 w-full rounded-[6px] bg-[var(--track-surface-muted)] pl-8 pr-3 text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for members"
              value={search}
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.length > 0 ? (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Active members
              </div>
              {filtered.map((m) => (
                <button
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--track-row-hover)] ${
                    m.id === selectedUserId ? "text-white" : "text-[var(--track-text-muted)]"
                  }`}
                  key={m.id}
                  onClick={onClose}
                  type="button"
                >
                  <MemberAvatar name={m.name} />
                  <span className="truncate">
                    {m.name}
                    {m.id === selectedUserId ? " (You)" : ""}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-[12px] text-[var(--track-text-muted)]">
              No members found
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoIcon(): ReactElement {
  return (
    <svg className="size-3.5 text-[var(--track-text-soft)]" fill="currentColor" viewBox="0 0 16 16">
      <path
        clipRule="evenodd"
        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 6H6.483a.2.2 0 0 0-.141.341l.6.6A.2.2 0 0 1 7 8.083V11c0 .556.448 1 1 1l.117-.007c.5-.058.883-.48.883-.993V8c0-.556-.448-1-1-1Zm0-3c-1 0-1 .448-1 1s0 1 1 1 1-.448 1-1 0-1-1-1Z"
        fillRule="evenodd"
      />
    </svg>
  );
}
