import type { ReactElement } from "react";

import { CalendarIcon, ChevronRightIcon, MembersIcon } from "../../shared/ui/icons.tsx";

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
        aria-label="Select previous period"
        className="flex size-7 items-center justify-center rounded-[6px] border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onPrevious}
        type="button"
      >
        <ChevronRightIcon className="size-3" style={{ transform: "rotate(180deg)" }} />
      </button>
      <button
        className="flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--track-border)] px-3 text-[12px] text-white"
        type="button"
      >
        <CalendarIcon className="size-3 text-[var(--track-text-muted)]" />
        {isCurrentWeek ? "This week" : `Week ${weekNumber}`}
        <span className="text-[var(--track-text-muted)]">&middot;W{weekNumber}</span>
      </button>
      <button
        aria-label="Select following period"
        className="flex size-7 items-center justify-center rounded-[6px] border border-[var(--track-border)] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={onNext}
        type="button"
      >
        <ChevronRightIcon className="size-3" />
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
      <MembersIcon className="size-3" />
      {label}
    </button>
  );
}
