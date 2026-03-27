import type { ReactElement } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";

export function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className={`relative flex h-[42px] items-center px-4 text-[13px] font-medium transition ${
        active ? "text-white" : "text-[var(--track-text-muted)] hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      {active ? (
        <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[var(--track-accent)]" />
      ) : null}
    </button>
  );
}

export function StatusTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className={`relative flex h-[38px] items-center px-3 text-[12px] font-medium transition ${
        active ? "text-white" : "text-[var(--track-text-muted)] hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      {active ? (
        <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--track-accent)]" />
      ) : null}
    </button>
  );
}

export function WeekPicker({
  isCurrentWeek,
  onNext,
  onPrevious,
  weekNumber,
}: {
  isCurrentWeek: boolean;
  onNext: () => void;
  onPrevious: () => void;
  weekNumber: number;
}): ReactElement {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Previous week"
        className="flex size-7 items-center justify-center rounded-[6px] border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onPrevious}
        type="button"
      >
        <TrackingIcon
          className="size-3"
          name="chevron-right"
          style={{ transform: "rotate(180deg)" }}
        />
      </button>
      <span className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--track-border)] px-3 text-[12px] text-white">
        {isCurrentWeek ? "This week" : `Week ${weekNumber}`}
        <span className="text-[var(--track-text-muted)]">&middot;</span>
        <span className="text-[var(--track-text-muted)]">W{weekNumber}</span>
      </span>
      <button
        aria-label="Next week"
        className="flex size-7 items-center justify-center rounded-[6px] border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onNext}
        type="button"
      >
        <TrackingIcon className="size-3" name="chevron-right" />
      </button>
    </div>
  );
}

export function FilterButton({ label }: { label: string }): ReactElement {
  return (
    <button
      className="flex h-7 items-center gap-1 rounded-[6px] border border-[var(--track-border)] px-3 text-[11px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
      type="button"
    >
      {label}
      <TrackingIcon className="size-2.5" name="chevron-down" />
    </button>
  );
}

export function ApprovalsEmptyState(): ReactElement {
  return (
    <div className="px-5 py-16 text-center" data-testid="approvals-empty">
      <p className="text-[14px] text-white">No timesheets to review.</p>
      <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
        It's been a while since your team added a time entry.
      </p>
      <button
        className="mt-3 text-[12px] font-semibold text-[var(--track-accent-text)] hover:underline"
        type="button"
      >
        Go to timesheet setup &gt;
      </button>
    </div>
  );
}
