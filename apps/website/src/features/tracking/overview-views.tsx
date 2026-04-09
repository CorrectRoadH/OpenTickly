import { type ReactElement, useRef, useState } from "react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppButton, IconButton as AppIconButton, SelectButton } from "@opentoggl/web-ui";

import type { CalendarSubview, TimerViewMode } from "./timer-view-mode.ts";
import { ChevronDownIcon } from "../../shared/ui/icons.tsx";

// ---------------------------------------------------------------------------
// Re-exports — keep existing import paths working
// ---------------------------------------------------------------------------

export { ListView } from "./ListView.tsx";
export { CalendarView, type CalendarContextMenuAction } from "./CalendarView.tsx";
export { TimesheetView } from "./TimesheetView.tsx";

// ---------------------------------------------------------------------------
// Shared UI components used by the timer page chrome
// ---------------------------------------------------------------------------

export function ToolbarButton({
  icon,
  label,
  suffix,
}: {
  icon: ReactElement;
  label: string;
  suffix: string;
}) {
  return (
    <AppButton className="gap-2" size="sm" type="button" variant="secondary">
      {icon}
      <span>{label}</span>
      <span className="text-[var(--track-text-muted)]">· {suffix}</span>
      <ChevronDownIcon className="size-3 text-[var(--track-text-muted)]" />
    </AppButton>
  );
}

export function SummaryStat({
  hideLabel = false,
  label,
  value,
}: {
  hideLabel?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`flex items-center rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 shadow-[var(--track-depth-shadow-rest)] ${
        hideLabel ? "gap-0" : "gap-2"
      }`}
    >
      <p
        className={
          hideLabel
            ? "sr-only"
            : "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]"
        }
      >
        {label}
      </p>
      <p className="text-[14px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

export function ChromeIconButton({
  "aria-label": ariaLabel,
  active,
  icon,
  onClick,
}: {
  "aria-label"?: string;
  active?: boolean;
  icon: ReactElement;
  onClick?: () => void;
}) {
  return (
    <AppIconButton
      aria-label={ariaLabel ?? "Icon button"}
      className={active ? "bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]" : ""}
      onClick={onClick}
      size="lg"
      type="button"
    >
      {icon}
    </AppIconButton>
  );
}

const CALENDAR_SUBVIEW_LABELS: Record<CalendarSubview, string> = {
  day: "Day view",
  "five-day": "5 days view",
  week: "Week view",
};

const CALENDAR_SUBVIEW_OPTIONS: CalendarSubview[] = ["week", "five-day", "day"];
const VIEW_TAB_LABELS: Record<TimerViewMode, string> = {
  calendar: "Calendar",
  list: "List",
  timesheet: "Timesheet",
};
const VIEW_TAB_RADIUS_CLASS: Record<TimerViewMode, string> = {
  calendar: "rounded-l-[6px]",
  list: "rounded-none",
  timesheet: "rounded-r-[6px]",
};

const viewTabGroupClass =
  "inline-flex items-center overflow-hidden rounded-[8px] bg-[var(--track-surface-muted)] p-[2px] shadow-[var(--track-depth-shadow-rest)]";

const viewTabClass =
  "inline-flex h-8 min-w-[96px] items-center justify-center px-4 text-[14px] font-semibold transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[var(--track-accent-outline)]";

export function CalendarSubviewSelect({
  onChange,
  value,
}: {
  onChange: (next: CalendarSubview) => void;
  value: CalendarSubview;
}) {
  const { t } = useTranslation("tracking");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
      ref={containerRef}
    >
      <SelectButton
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("calendarSubView")}
        className="min-w-[118px]"
        data-testid="calendar-subview-select"
        onClick={() => setOpen((prev) => !prev)}
      >
        {CALENDAR_SUBVIEW_LABELS[value]}
      </SelectButton>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[160px] rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-lg"
          role="listbox"
        >
          {CALENDAR_SUBVIEW_OPTIONS.map((option) => (
            <button
              aria-selected={option === value}
              className={`flex w-full items-center px-3 py-2 text-[12px] transition hover:bg-[var(--track-row-hover)] ${
                option === value ? "font-semibold text-[var(--track-accent)]" : "text-white"
              }`}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {CALENDAR_SUBVIEW_LABELS[option]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ViewTabGroup({
  children,
  label,
  onSelect,
  options,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onSelect: (view: TimerViewMode) => void;
  options: TimerViewMode[];
  value: TimerViewMode;
}): ReactElement {
  return (
    <div
      aria-label={label}
      className={viewTabGroupClass}
      data-testid="view-tab-group"
      onKeyDown={(e) => {
        const idx = options.indexOf(value);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = options[(idx + 1) % options.length];
          onSelect(next);
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          const prev = options[(idx - 1 + options.length) % options.length];
          onSelect(prev);
        }
      }}
      role="radiogroup"
    >
      {children}
    </div>
  );
}

export function ViewTab({
  currentView,
  onSelect,
  targetView,
}: {
  currentView: TimerViewMode;
  onSelect: (view: TimerViewMode) => void;
  targetView: TimerViewMode;
}): ReactElement {
  const isSelected = currentView === targetView;
  return (
    <button
      aria-checked={isSelected}
      className={`${viewTabClass} ${VIEW_TAB_RADIUS_CLASS[targetView]} ${
        isSelected
          ? "bg-[var(--track-surface)] text-white shadow-[var(--track-depth-shadow-rest)]"
          : "text-[var(--track-text-soft)] hover:text-white"
      }`}
      data-testid={`view-tab-${targetView}`}
      onClick={() => onSelect(targetView)}
      role="radio"
      tabIndex={isSelected ? 0 : -1}
      type="button"
    >
      {VIEW_TAB_LABELS[targetView]}
    </button>
  );
}

export function SurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`border-t border-[var(--track-border)] px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}
