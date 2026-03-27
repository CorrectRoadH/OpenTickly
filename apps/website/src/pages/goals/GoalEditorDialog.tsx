import { type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type { HandlergoalsApiResponse } from "../../shared/api/generated/public-track/types.gen.ts";

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
  { label: "at least", value: "gte" },
  { label: "at most", value: "lte" },
  { label: "exactly", value: "equal" },
];

const RECURRENCE_OPTIONS = [
  { label: "every day", value: "daily" },
  { label: "every week", value: "weekly" },
  { label: "every month", value: "monthly" },
];

function targetSecondsToHours(seconds?: number): number {
  if (!seconds) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

export function GoalEditorDialog({
  goal,
  isPending,
  onClose,
  onSubmit,
}: GoalEditorDialogProps): ReactElement {
  const isEdit = goal != null;
  const [name, setName] = useState(goal?.name ?? "");
  const [comparison, setComparison] = useState(goal?.comparison ?? "gte");
  const [targetHours, setTargetHours] = useState(
    isEdit ? targetSecondsToHours(goal.target_seconds) : 0,
  );
  const [recurrence, setRecurrence] = useState(goal?.recurrence ?? "daily");
  const [endDate, setEndDate] = useState(goal?.end_date ?? "");
  const [noEndDate, setNoEndDate] = useState(!goal?.end_date);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-[520px] rounded-lg bg-[var(--track-surface-raised)] shadow-2xl"
        data-testid="goal-editor-dialog"
      >
        <div className="flex items-center justify-between border-b border-[var(--track-border)] px-6 py-4">
          <h5 className="text-[16px] font-semibold text-white">
            {isEdit ? "Edit goal" : "Create a goal"}
          </h5>
          <button
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <TrackingIcon className="size-4" name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              Goal
            </label>
            <input
              autoFocus
              className="h-10 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
              data-testid="goal-name-input"
              onChange={(e) => setName(e.target.value)}
              placeholder="Goal name"
              type="text"
              value={name}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              For
            </label>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
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
              <div className="flex items-center gap-1">
                <input
                  className="h-10 w-16 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-center text-[14px] text-white focus:border-[var(--track-accent)] focus:outline-none"
                  data-testid="goal-hours-input"
                  min={0}
                  onChange={(e) => setTargetHours(Number(e.target.value) || 0)}
                  type="number"
                  value={targetHours || ""}
                />
                <span className="text-[13px] text-[var(--track-text-muted)]">hours</span>
              </div>
              <select
                className="h-10 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
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
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
              Until
            </label>
            <div className="flex flex-col gap-2">
              <input
                className="h-10 w-48 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white disabled:opacity-40 focus:border-[var(--track-accent)] focus:outline-none"
                data-testid="goal-end-date-input"
                disabled={noEndDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                type="date"
                value={endDate}
              />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white">
                <input
                  checked={noEndDate}
                  className="accent-[var(--track-accent)]"
                  data-testid="goal-no-end-date-checkbox"
                  onChange={(e) => setNoEndDate(e.target.checked)}
                  type="checkbox"
                />
                No end date
              </label>
            </div>
          </div>

          {!isEdit ? (
            <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
              Note: you cannot change the projects, tasks, tags, billable or recurrence period of a
              created goal.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--track-border)] px-6 py-4">
          <button
            className="h-9 rounded-lg px-4 text-[13px] font-medium text-white hover:bg-[var(--track-row-hover)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-lg bg-[var(--track-accent)] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
            data-testid="goal-submit-button"
            disabled={!name.trim() || isPending}
            onClick={handleSubmit}
            type="button"
          >
            {isEdit ? "Save" : "Create goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
