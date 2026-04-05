import { type ReactElement, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown as ChevronDownLucide, Search as SearchLucide } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppButton, Dropdown, SelectDropdown, useDropdownClose } from "@opentoggl/web-ui";

import { postTimesheetSetups } from "../../shared/api/public/track/index.ts";
import type { ModelsSimpleWorkspaceUser } from "../../shared/api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useWorkspaceUsersQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type TimesheetSetupDialogProps = {
  onClose: () => void;
};

export function TimesheetSetupDialog({ onClose }: TimesheetSetupDialogProps): ReactElement {
  const { t } = useTranslation("approvals");
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
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDay, setReminderDay] = useState(5); // Friday = 5
  const [reminderTime, setReminderTime] = useState("17:00");
  const [sendViaSlack, setSendViaSlack] = useState(false);
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [memberSearch, setMemberSearch] = useState("");

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
            reminder_day: reminderEnabled ? (reminderDay as 0 | 1 | 2 | 3 | 4 | 5 | 6) : undefined,
            reminder_time: reminderEnabled ? reminderTime : undefined,
            email_reminder_enabled: reminderEnabled && sendViaEmail,
            slack_reminder_enabled: reminderEnabled && sendViaSlack,
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
          <h1 className="text-[14px] font-semibold text-white">{t("setUpTimesheetsForMembers")}</h1>
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
          <p className="mb-6 text-[12px] leading-5 text-[var(--track-text-muted)]">
            {t("timesheetSetupDescription")}
          </p>

          {/* Members */}
          <FieldLabel>{t("members")}</FieldLabel>
          <Dropdown
            className="mb-5"
            trigger={
              <button
                className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] text-white"
                type="button"
              >
                <span
                  className={
                    selectedMemberIds.size > 0 ? "text-white" : "text-[var(--track-text-muted)]"
                  }
                >
                  {selectedMemberIds.size > 0
                    ? t("membersSelected", { count: selectedMemberIds.size })
                    : t("selectMembers")}
                </span>
                <ChevronDown />
              </button>
            }
          >
            <div className="flex items-center gap-2 border-b border-[var(--track-border)] px-3 py-2">
              <SearchIcon />
              <input
                className="flex-1 bg-transparent text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t("findMembers")}
                type="text"
                value={memberSearch}
              />
            </div>
            <div className="flex items-center gap-3 border-b border-[var(--track-border)] px-3 py-1.5 text-[11px]">
              <span className="text-[var(--track-text-muted)]">{t("activeUsers")}</span>
              <button
                className="text-[var(--track-accent)] hover:underline"
                onClick={selectAllMembers}
                type="button"
              >
                {t("all")}
              </button>
              <button
                className="text-[var(--track-accent)] hover:underline"
                onClick={selectNoneMembers}
                type="button"
              >
                {t("none")}
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
                  <span className="text-[12px] text-white">{m.name}</span>
                </label>
              ))}
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-3 text-center text-[12px] text-[var(--track-text-muted)]">
                  {t("noMembersFound")}
                </div>
              ) : null}
            </div>
          </Dropdown>

          {/* Approver */}
          <FieldLabel>{t("approverLevel1")}</FieldLabel>
          <Dropdown
            className="mb-5"
            trigger={
              <button
                className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] text-white"
                type="button"
              >
                <span
                  className={
                    approverIds.length > 0 ? "text-white" : "text-[var(--track-text-muted)]"
                  }
                >
                  {approverIds.length > 0
                    ? (members.find((m) => m.id === approverIds[0])?.name ?? t("selected"))
                    : t("selectTimesheetApprover")}
                </span>
                <ChevronDown />
              </button>
            }
          >
            <ApproverList approverIds={approverIds} members={members} onSelect={setApproverIds} />
          </Dropdown>

          {/* Period */}
          <FieldLabel>{t("period")}</FieldLabel>
          <div className="mb-5 flex items-center gap-3">
            <SelectDropdown
              onChange={(v) => setPeriodicity(v)}
              options={[
                { value: "weekly", label: t("weekly") },
                { value: "daily", label: t("daily") },
                { value: "monthly", label: t("monthly") },
              ]}
              value={periodicity}
            />
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--track-text-muted)]">
                {t("startingFrom")}
              </span>
              <input
                className="h-9 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[12px] text-white"
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                value={startDate}
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="border-t border-[var(--track-border)] pt-5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                checked={reminderEnabled}
                className="accent-[var(--track-accent)]"
                onChange={(e) => setReminderEnabled(e.target.checked)}
                type="checkbox"
              />
              <span className="text-[12px] text-white">{t("remindMembersToSubmit")}</span>
            </label>
            {reminderEnabled ? (
              <div className="mt-3 pl-7">
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px] text-white">
                  <span className="text-[var(--track-text-muted)]">
                    {periodicity === "daily" ? t("dailyAt") : `${t(periodicity)} ${t("on")}`}
                  </span>
                  {periodicity !== "daily" ? (
                    <SelectDropdown
                      onChange={(v) => setReminderDay(Number(v))}
                      options={WEEKDAY_KEYS.map((key, i) => ({
                        value: String(WEEKDAY_VALUES[i]),
                        label: t(key),
                      }))}
                      value={String(reminderDay)}
                    />
                  ) : null}
                  <span className="text-[var(--track-text-muted)]">{t("at")}</span>
                  <SelectDropdown
                    onChange={(v) => setReminderTime(v)}
                    options={TIMES.map((t) => ({ value: t, label: t }))}
                    value={reminderTime}
                  />
                </div>
                <label className="mb-2 flex cursor-pointer items-center gap-2.5">
                  <input
                    checked={sendViaSlack}
                    className="accent-[var(--track-accent)]"
                    onChange={(e) => setSendViaSlack(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-[12px] text-white">{t("sendReminderViaSlack")}</span>
                </label>
                <label className="mb-2 flex cursor-pointer items-center gap-2.5">
                  <input
                    checked={sendViaEmail}
                    className="accent-[var(--track-accent)]"
                    onChange={(e) => setSendViaEmail(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-[12px] text-white">{t("sendReminderViaEmail")}</span>
                </label>
                <p className="mt-2 text-[12px] text-[var(--track-text-muted)]">
                  {t("firstReminderSentOn", { date: computeFirstReminder(startDate, reminderDay) })}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--track-border)] px-6 py-4">
          <AppButton
            disabled={selectedMemberIds.size === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            type="button"
          >
            {createMutation.isPending ? t("settingUp") : t("setUpTimesheets")}
          </AppButton>
          {createMutation.isError ? (
            <p className="mt-2 text-center text-[12px] text-[var(--track-status-rejected)]">
              {t("failedToCreateTimesheetSetup")}
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

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

const TIMES = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

function computeFirstReminder(startDateStr: string, reminderDay: number): string {
  const start = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "—";
  // Find the next occurrence of reminderDay after start
  const d = new Date(start);
  for (let i = 0; i < 14; i++) {
    d.setDate(start.getDate() + i);
    if (d.getDay() === reminderDay && d >= start) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
  }
  return "—";
}

function ApproverList({
  approverIds,
  members,
  onSelect,
}: {
  approverIds: number[];
  members: MemberOption[];
  onSelect: (ids: number[]) => void;
}): ReactElement {
  const close = useDropdownClose();

  return (
    <div className="max-h-[200px] overflow-y-auto py-1">
      {members.map((m) => (
        <button
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[var(--track-row-hover)] ${
            approverIds.includes(m.id) ? "bg-[var(--track-row-hover)]" : ""
          }`}
          key={m.id}
          onClick={() => {
            onSelect([m.id]);
            close();
          }}
          type="button"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[10px] font-semibold text-[var(--track-accent)]">
            {m.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[12px] text-white">{m.name}</span>
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: string }): ReactElement {
  return (
    <div className="mb-1.5 text-[11px] font-medium text-[var(--track-text-muted)]">{children}</div>
  );
}

function ChevronDown(): ReactElement {
  return (
    <ChevronDownLucide
      aria-hidden="true"
      className="h-3 w-3 text-[var(--track-text-muted)]"
      size={12}
      strokeWidth={2}
    />
  );
}

function SearchIcon(): ReactElement {
  return (
    <SearchLucide
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-[var(--track-text-muted)]"
      size={14}
      strokeWidth={2}
    />
  );
}
