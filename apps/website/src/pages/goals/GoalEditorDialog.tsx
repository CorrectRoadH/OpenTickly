import { type ReactElement, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Check, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppButton, SelectDropdown } from "@opentoggl/web-ui";
import { DatePickerButton } from "../../shared/ui/DatePickerButton.tsx";
import { CalendarIcon, ChevronDownIcon, SearchIcon } from "../../shared/ui/icons.tsx";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import type { WorkspaceMemberDto } from "../../shared/api/web-contract.ts";
import {
  useProjectsQuery,
  useTagsQuery,
  useWorkspaceMembersQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { GoalTrackPicker } from "./GoalTrackPicker.tsx";

type GoalEditorDialogProps = {
  goal?: HandlergoalsApiResponse | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => void;
};

export type GoalFormData = {
  billable: boolean;
  comparison: string;
  endDate: string;
  name: string;
  noEndDate: boolean;
  projectIds: number[];
  recurrence: string;
  tagIds: number[];
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

const ICON_OPTIONS: { emoji: string; label: string; value: string }[] = [
  { emoji: "🎯", label: "Target", value: "target" },
  { emoji: "🕐", label: "Clock", value: "clock" },
  { emoji: "⭐", label: "Star", value: "star" },
  { emoji: "❤️", label: "Heart", value: "heart" },
  { emoji: "⚡", label: "Lightning", value: "lightning" },
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
  const { t } = useTranslation("goals");
  const isEdit = goal != null;
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const membersQuery = useWorkspaceMembersQuery(workspaceId);
  const projectsQuery = useProjectsQuery(workspaceId, "active");
  const tagsQuery = useTagsQuery(workspaceId);

  const { getValues, setValue, watch } = useForm({
    defaultValues: {
      billable: goal?.billable ?? false,
      comparison: goal?.comparison ?? "more_than",
      endDate: goal?.end_date ?? "",
      icon: goal?.icon ?? "target",
      name: goal?.name ?? "",
      noEndDate: !goal?.end_date,
      projectIds: goal?.project_ids ?? ([] as number[]),
      recurrence: goal?.recurrence ?? "daily",
      selectedUserId: goal?.user_id ?? session.user.id ?? 0,
      tagIds: goal?.tag_ids ?? ([] as number[]),
      targetHours: isEdit ? targetSecondsToHours(goal.target_seconds) : 2,
    },
  });
  const [memberOpen, setMemberOpen] = useState(false);
  const name = watch("name");
  const icon = watch("icon");
  const comparison = watch("comparison");
  const targetHours = watch("targetHours");
  const recurrence = watch("recurrence");
  const endDate = watch("endDate");
  const noEndDate = watch("noEndDate");
  const selectedUserId = watch("selectedUserId");
  const projectIds = watch("projectIds");
  const tagIds = watch("tagIds");
  const billable = watch("billable");

  const allProjects = projectsQuery.data ?? [];
  const allTags = (tagsQuery.data ?? [])
    .filter((t) => t.id != null && t.name != null && !t.deleted_at)
    .map((t) => ({ id: t.id!, name: t.name! }));

  const members = membersQuery.data?.members ?? [];
  const selectedMember = members.find((m) => m.id === selectedUserId);
  const memberDisplayName =
    selectedMember?.name ?? goal?.user_name ?? session.user.fullName ?? t("me");

  function handleSubmit() {
    const values = getValues();
    if (!values.name.trim()) return;
    onSubmit({
      billable: values.billable,
      comparison: values.comparison,
      endDate: values.noEndDate ? "" : values.endDate,
      name: values.name.trim(),
      noEndDate: values.noEndDate,
      projectIds: values.projectIds,
      recurrence: values.recurrence,
      tagIds: values.tagIds,
      targetHours: values.targetHours,
    });
  }

  return (
    <ModalDialog
      footer={
        <>
          <AppButton onClick={onClose} type="button">
            {t("cancel")}
          </AppButton>
          <AppButton
            data-testid="goal-submit-button"
            disabled={!name.trim() || isPending}
            onClick={handleSubmit}
            type="button"
          >
            {isEdit ? t("editGoal") : t("createGoal")}
          </AppButton>
        </>
      }
      onClose={onClose}
      testId="goal-editor-dialog"
      title={isEdit ? t("editGoal") : t("createAGoal")}
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
              onChange={(e) => setValue("name", e.target.value)}
              placeholder={t("goalNamePlaceholder")}
              type="text"
              value={name}
            />
            <GoalIconPicker onChange={(v: string) => setValue("icon", v)} value={icon} />
          </div>
        </div>

        {/* MEMBER */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {t("member")}
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
              <ChevronDownIcon className="size-2.5 text-[var(--track-text-muted)]" />
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
            {t("track")}
            <InfoIcon />
          </label>
          <GoalTrackPicker
            billable={billable}
            disabled={isEdit}
            onBillableChange={(v: boolean) => setValue("billable", v)}
            onProjectIdsChange={(ids: number[]) => setValue("projectIds", ids)}
            onTagIdsChange={(ids: number[]) => setValue("tagIds", ids)}
            projectIds={projectIds}
            projects={allProjects}
            tagIds={tagIds}
            tags={allTags}
          />
        </div>

        {/* FOR */}
        <div>
          <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {t("for")}
            <InfoIcon />
          </label>
          <div className="flex items-center gap-2">
            <SelectDropdown
              data-testid="goal-comparison-select"
              disabled={isEdit}
              onChange={(v) => setValue("comparison", v)}
              options={COMPARISON_OPTIONS}
              value={comparison}
            />
            <div className="flex h-[42px] items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3">
              <input
                className="w-12 bg-transparent text-[14px] text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                data-testid="goal-hours-input"
                min={0}
                onChange={(e) => setValue("targetHours", Number(e.target.value) || 0)}
                type="number"
                value={targetHours || ""}
              />
              <span className="text-[14px] text-[var(--track-text-muted)]">{t("hours")}</span>
            </div>
            <SelectDropdown
              data-testid="goal-recurrence-select"
              disabled={isEdit}
              onChange={(v) => setValue("recurrence", v)}
              options={RECURRENCE_OPTIONS}
              value={recurrence}
            />
          </div>
        </div>

        {/* UNTIL */}
        <div>
          <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {t("until")}
            <InfoIcon />
          </label>
          <div className="flex flex-col gap-2">
            <div className="relative w-48">
              {noEndDate ? (
                <button
                  className="flex h-[42px] w-full items-center gap-2 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white"
                  onClick={() => setValue("noEndDate", false)}
                  type="button"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="flex-1">{t("indefinite")}</span>
                  <ChevronDownIcon className="size-2.5 text-[var(--track-text-muted)]" />
                </button>
              ) : (
                <DatePickerButton
                  className="h-[42px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-left text-[14px] text-white"
                  onChange={(v: string) => setValue("endDate", v)}
                  placeholder={t("selectEndDate")}
                  testId="goal-end-date-input"
                  value={endDate}
                />
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white">
              <span
                className={`flex size-[14px] items-center justify-center rounded-[4px] ${
                  noEndDate
                    ? "bg-[var(--track-accent)]"
                    : "border border-[var(--track-border)] bg-transparent"
                }`}
              >
                {noEndDate ? (
                  <Check
                    aria-hidden="true"
                    className="size-2.5 text-white"
                    size={10}
                    strokeWidth={2.5}
                  />
                ) : null}
              </span>
              <input
                checked={noEndDate}
                className="sr-only"
                data-testid="goal-no-end-date-checkbox"
                onChange={(e) => setValue("noEndDate", e.target.checked)}
                type="checkbox"
              />
              {t("noEndDate")}
            </label>
          </div>
        </div>

        {/* Note */}
        <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
          Note: you cannot change the projects, tasks, tags, billable or recurrence period of a
          created goal.
        </p>
      </div>
    </ModalDialog>
  );
}

function MemberAvatar({ name }: { name: string }): ReactElement {
  const initials = resolveInitials(name);
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent)] text-[10px] font-bold text-black">
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
  const { t } = useTranslation("goals");
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(panelRef, true, onClose);
  const activeMembers = members.filter((m) => m.status === "joined" || m.status === "restored");
  const filtered = activeMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-tooltip-surface)] shadow-lg"
      ref={panelRef}
    >
      <div className="border-b border-[var(--track-border)] px-3 py-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--track-text-muted)]" />
          <input
            autoFocus
            className="h-8 w-full rounded-[6px] bg-[var(--track-surface-muted)] pl-8 pr-3 text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchForMembers")}
            value={search}
          />
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto py-1">
        {filtered.length > 0 ? (
          <>
            <div className="px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              {t("activeMembers")}
            </div>
            {filtered.map((m) => (
              <button
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--track-row-hover)] ${
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
            {t("noMembersFound")}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalIconPicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeDropdown = () => setOpen(false);
  useDismiss(rootRef, open, closeDropdown);
  const current = ICON_OPTIONS.find((o) => o.value === value) ?? ICON_OPTIONS[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-label="Goal icon"
        className="flex h-[42px] items-center gap-1.5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[18px]"
        data-testid="goal-icon-select"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{current.emoji}</span>
        <ChevronDownIcon className="size-2.5 text-[var(--track-text-muted)]" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 flex gap-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-tooltip-surface)] p-2 shadow-lg">
          {ICON_OPTIONS.map((opt) => (
            <button
              className={`flex size-9 items-center justify-center rounded-[6px] text-[18px] hover:bg-[var(--track-row-hover)] ${
                opt.value === value ? "bg-[var(--track-row-hover)]" : ""
              }`}
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              title={opt.label}
              type="button"
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InfoIcon(): ReactElement {
  return (
    <Info
      aria-hidden="true"
      className="size-3.5 text-[var(--track-text-soft)]"
      size={14}
      strokeWidth={1.7}
    />
  );
}
