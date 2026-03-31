import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDropModule from "react-big-calendar/lib/addons/dragAndDrop";
import type { EventProps, SlotInfo } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { enUS } from "date-fns/locale/en-US";
import {
  AppButton,
  DropdownMenu,
  IconButton as AppIconButton,
  MenuItem,
  MenuLink,
  MenuSeparator,
  SelectButton,
} from "@opentoggl/web-ui";
import "./calendar.css";

import { calendarDayLayout } from "./calendar-day-layout.ts";
import { CalendarEntryContextMenu } from "./CalendarEntryContextMenu.tsx";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  formatClockDuration,
  formatEntryRange,
  formatGroupLabel,
  formatHours,
  formatWeekday,
  resolveEntryColor,
  resolveEntryDurationSeconds,
  sumForDate,
  type DisplayEntry,
  type EntryGroup,
  type TimesheetRow,
} from "./overview-data.ts";
import { useUserPreferences } from "../../shared/query/useUserPreferences.ts";
import {
  BulkActionToolbar,
  BulkEditDialog,
  DeleteConfirmDialog,
  useListSelection,
} from "./list-bulk-actions.tsx";
import { ProjectPickerDropdown, TagPickerDropdown } from "./bulk-edit-pickers.tsx";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import type { CalendarSubview, TimerViewMode } from "./timer-view-mode.ts";
import {
  ChevronDownIcon,
  DollarIcon,
  MinusIcon,
  MoreIcon,
  PlayIcon,
  PlusIcon,
  ProjectsIcon,
  TagsIcon,
} from "../../shared/ui/icons.tsx";
const withDragAndDrop =
  typeof withDragAndDropModule === "function"
    ? withDragAndDropModule
    : (
        withDragAndDropModule as {
          default?: typeof withDragAndDropModule;
        }
      ).default;

if (!withDragAndDrop) {
  throw new Error("react-big-calendar drag-and-drop addon failed to load");
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

type CalendarEvent = {
  allDay: false;
  end: Date;
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  id: number;
  resource: {
    color: string;
    isDraft: boolean;
    isLocked: boolean;
    isRunning: boolean;
  };
  start: Date;
  title: string;
};

/**
 * Split a time range into segments at each midnight boundary.
 * E.g. 22:00 Day1 → 02:00 Day2 becomes [{22:00→00:00}, {00:00→02:00}].
 * Returns a single-element array when start and end fall on the same calendar date.
 */
function splitAtMidnight(start: Date, end: Date): Array<{ end: Date; start: Date }> {
  const segments: Array<{ end: Date; start: Date }> = [];
  let cursor = start;

  while (true) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);

    if (nextMidnight >= end) {
      segments.push({ end, start: cursor });
      break;
    }

    // End the segment 1ms before midnight so react-big-calendar keeps it
    // in the time grid instead of promoting it to an all-day header event.
    const segmentEnd = new Date(nextMidnight.getTime() - 1);
    segments.push({ end: segmentEnd, start: cursor });
    cursor = nextMidnight;
  }

  return segments;
}

function buildCalendarLocalizer(weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return dateFnsLocalizer({
    format,
    getDay,
    locales: { "en-US": enUS },
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn }),
  });
}

/**
 * Custom day column wrapper matching Toggl's StyledDayColumnWrapper.
 * Uses forwardRef because RBC's DayColumn passes a ref to dayColumnWrapper.
 * On the "today" column, appends a play button next to the RBC-rendered
 * .rbc-current-time-indicator.
 */
const CalendarDayColumnWrapper = React.forwardRef<
  HTMLDivElement,
  {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    isNow?: boolean;
    onStartEntry?: () => void;
  }
>(function CalendarDayColumnWrapper({ children, className, style, isNow, onStartEntry }, ref) {
  const columnRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<SVGSVGElement>(null);

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      (columnRef as { current: HTMLDivElement | null }).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  useEffect(() => {
    if (!isNow || !columnRef.current || !playRef.current) return;

    function syncPosition() {
      const indicator = columnRef.current?.querySelector<HTMLElement>(
        ".rbc-current-time-indicator",
      );
      if (indicator && playRef.current) {
        playRef.current.style.top = indicator.style.top;
      }
    }

    syncPosition();
    const interval = setInterval(syncPosition, 10_000);
    return () => clearInterval(interval);
  }, [isNow]);

  return (
    <div className={className} ref={setRef} style={style}>
      {children}
      {isNow ? (
        <svg
          className="calendar-indicator-play-btn absolute cursor-pointer"
          data-testid="current-time-indicator-play"
          fill="none"
          height="16"
          onClick={(e) => {
            e.stopPropagation();
            onStartEntry?.();
          }}
          ref={playRef}
          style={{ pointerEvents: "all", left: "-7px", marginTop: "-6.5px" }}
          viewBox="0 0 36 36"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="var(--track-accent)" height="36" rx="18" width="36" />
          <path
            d="M13 11.994c0-1.101.773-1.553 1.745-.997l10.51 6.005c.964.55.972 1.439 0 1.994l-10.51 6.007c-.964.55-1.745.102-1.745-.997V11.994z"
            fill="var(--track-canvas)"
          />
        </svg>
      ) : null}
    </div>
  );
});

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

export function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline gap-2 text-[11px] uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
      <span>{label}</span>
      <span className="text-[14px] font-semibold tabular-nums text-white">{value}</span>
    </p>
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
  list: "List view",
  timesheet: "Timesheet",
};

const viewTabGroupClass =
  "inline-flex items-center overflow-hidden rounded-[8px] bg-[var(--track-surface)] shadow-[var(--track-depth-shadow-rest)]";

const viewTabClass =
  "inline-flex h-8 min-w-[96px] items-center justify-center px-4 text-[14px] font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--track-accent-outline)]";

export function CalendarSubviewSelect({
  onChange,
  value,
}: {
  onChange: (next: CalendarSubview) => void;
  value: CalendarSubview;
}) {
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
        aria-label="Calendar sub-view"
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
}) {
  const selectedIndex = options.indexOf(value);
  const groupRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex = selectedIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (selectedIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (selectedIndex - 1 + options.length) % options.length;
    } else {
      return;
    }
    event.preventDefault();
    onSelect(options[nextIndex]);
    // Move focus to the newly selected tab so the user can immediately activate it with Space/Enter
    requestAnimationFrame(() => {
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[nextIndex]?.focus();
    });
  }

  return (
    <div
      aria-label={label}
      className={viewTabGroupClass}
      onKeyDown={handleKeyDown}
      ref={groupRef}
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
}) {
  const isSelected = currentView === targetView;
  return (
    <button
      aria-checked={isSelected}
      className={`${viewTabClass} ${
        isSelected
          ? "translate-y-px bg-[var(--track-accent-soft-strong)] text-[var(--track-accent-text)] shadow-[inset_0_1px_0_0_rgba(0,0,0,0.28)]"
          : "text-[var(--track-text-muted)] hover:bg-[var(--track-row-hover)] hover:text-white active:translate-y-px"
      }`}
      data-state={isSelected ? "active" : "inactive"}
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

export function ListView({
  groups,
  hasMore,
  isLoadingMore,
  nowMs,
  onBillableToggle,
  onBulkDelete,
  onBulkEdit,
  onContinueEntry,
  onDeleteEntry,
  onDescriptionChange,
  onDuplicateEntry,
  onEditEntry,
  onFavoriteEntry,
  onLoadMore,
  onProjectChange,
  onSplitEntry,
  onTagsChange,
  projects,
  tags,
  timezone,
  workspaceName,
}: {
  groups: EntryGroup[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  nowMs?: number;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onBulkDelete?: (ids: number[]) => void;
  onBulkEdit?: (ids: number[], updates: import("./list-bulk-actions.tsx").BulkEditUpdates) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDeleteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDescriptionChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    description: string,
  ) => void;
  onDuplicateEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onFavoriteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onLoadMore?: () => void;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  onSplitEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  projects?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorProject[];
  tags?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorTag[];
  timezone: string;
  workspaceName?: string;
}): ReactElement {
  const { durationFormat, timeofdayFormat } = useUserPreferences();
  const {
    clearSelection,
    isGroupFullySelected,
    isGroupPartiallySelected,
    selectedIds,
    toggleEntry,
    toggleGroup,
  } = useListSelection(groups);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return <SurfaceMessage message="No time entries in this workspace yet." />;
  }

  return (
    <div data-testid="timer-list-view">
      {selectedIds.size > 0 ? (
        <BulkActionToolbar
          count={selectedIds.size}
          onClear={clearSelection}
          onDelete={() => setDeleteConfirmOpen(true)}
          onEdit={() => setBulkEditOpen(true)}
        />
      ) : null}

      {bulkEditOpen ? (
        <BulkEditDialog
          count={selectedIds.size}
          onClose={() => setBulkEditOpen(false)}
          onSave={(updates) => {
            onBulkEdit?.([...selectedIds], updates);
            setBulkEditOpen(false);
            clearSelection();
          }}
          projects={projects ?? []}
          tags={tags ?? []}
          workspaceName={workspaceName ?? "Workspace"}
        />
      ) : null}

      {deleteConfirmOpen ? (
        <DeleteConfirmDialog
          count={selectedIds.size}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            onBulkDelete?.([...selectedIds]);
            setDeleteConfirmOpen(false);
            clearSelection();
          }}
        />
      ) : null}

      {groups.map((group) => {
        const groupChecked = isGroupFullySelected(group);
        const groupIndeterminate = isGroupPartiallySelected(group);
        return (
          <ul key={group.key} className="border-b-[4px] border-[var(--track-border)]">
            {/* Day header row */}
            <li className="flex h-[50px] items-center px-5">
              <input
                aria-label={`Select all entries for ${formatGroupLabel(group.key, timezone)}`}
                checked={groupChecked}
                className={`size-[13px] shrink-0 cursor-pointer appearance-none rounded-[3px] border bg-transparent ${
                  groupChecked || groupIndeterminate
                    ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
                    : "border-[var(--track-border)]"
                }`}
                onChange={() => toggleGroup(group)}
                ref={(el) => {
                  if (el) el.indeterminate = groupIndeterminate;
                }}
                type="checkbox"
              />
              <p className="ml-3 flex-1 text-[14px] font-medium text-white">
                {formatGroupLabel(group.key, timezone)}
              </p>
              <p className="text-right text-[14px] font-medium tabular-nums text-white">
                {formatClockDuration(group.totalSeconds, durationFormat)}
              </p>
            </li>

            {/* Entry rows */}
            {group.entries.map((entry) => {
              const displayEntry = entry as DisplayEntry;
              const groupCount = displayEntry._groupCount ?? 0;
              const groupKey = `${group.key}-${entry.id}-${entry.description}`;
              const isExpanded = expandedGroupKeys.has(groupKey);
              // Toggl: expanded shows parent row (badge + totals) + all child rows.
              // Collapsed shows just the representative row with badge.
              const entriesToRender =
                groupCount > 1 && isExpanded
                  ? [entry, ...(displayEntry._groupEntries ?? [])]
                  : [entry];

              return entriesToRender.map((renderEntry, subIdx) => {
                const entryId = renderEntry.id;
                const isSelected = typeof entryId === "number" && selectedIds.has(entryId);
                const isCollapsedRow = groupCount > 1 && !isExpanded && subIdx === 0;
                const isExpandedGroup = groupCount > 1 && isExpanded;
                return (
                  <li
                    key={`${renderEntry.id ?? "no-id"}-${subIdx}`}
                    className={`group grid h-[50px] items-center pr-2 pl-5 text-[14px] text-white transition-colors hover:bg-[var(--track-row-hover)] ${
                      isSelected ? "bg-[var(--track-row-hover)]" : ""
                    } ${isExpandedGroup ? "bg-[var(--track-row-hover)]/50" : ""}`}
                    data-entry-description={renderEntry.description?.trim() || ""}
                    data-entry-id={
                      typeof renderEntry.id === "number" ? String(renderEntry.id) : undefined
                    }
                    data-testid="time-entry-list-row"
                    style={{
                      gridTemplateColumns:
                        "1fr minmax(50px, 180px) 30px 100px 120px 40px 30px",
                    }}
                  >
                    {/* Left: checkbox + badge + description + project */}
                    <div className="flex min-w-0 items-center gap-0">
                      <div className="flex w-[30px] shrink-0 items-center justify-center">
                        <input
                          aria-label={`Select ${renderEntry.description?.trim() || "time entry"}`}
                          checked={isSelected}
                          className={`size-[13px] cursor-pointer appearance-none rounded-[3px] border bg-transparent opacity-0 transition group-hover:opacity-100 ${
                            isSelected
                              ? "!opacity-100 border-[var(--track-accent)] bg-[var(--track-accent)]"
                              : "border-[var(--track-border)]"
                          }`}
                          onChange={() => {
                            if (typeof entryId === "number") toggleEntry(entryId);
                          }}
                          type="checkbox"
                        />
                      </div>

                      {isCollapsedRow ? (
                        <button
                          aria-label={`Expand ${groupCount} similar entries`}
                          className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-border)] text-[11px] font-semibold tabular-nums text-[var(--track-text-muted)] hover:border-[var(--track-text-disabled)] hover:text-white"
                          onClick={() => {
                            setExpandedGroupKeys((prev) => {
                              const next = new Set(prev);
                              next.add(groupKey);
                              return next;
                            });
                          }}
                          type="button"
                        >
                          {groupCount}
                        </button>
                      ) : groupCount > 1 && isExpanded && subIdx === 0 ? (
                        <button
                          aria-label="Collapse similar entries"
                          className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--track-accent)] text-[11px] font-semibold tabular-nums text-[var(--track-accent)] hover:bg-[var(--track-accent)]/10"
                          onClick={() => {
                            setExpandedGroupKeys((prev) => {
                              const next = new Set(prev);
                              next.delete(groupKey);
                              return next;
                            });
                          }}
                          type="button"
                        >
                          {groupCount}
                        </button>
                      ) : null}

                      <div className="min-w-0 shrink">
                        <InlineDescription
                          entry={renderEntry}
                          isRunning={isRunningTimeEntry(renderEntry)}
                          onChange={onDescriptionChange}
                        />
                      </div>

                      <div className="ml-3 min-w-0 shrink-0">
                        <ListRowProjectPicker
                          entry={renderEntry}
                          onProjectChange={onProjectChange}
                          projects={projects ?? []}
                          workspaceName={workspaceName ?? "Workspace"}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="min-w-0 overflow-hidden">
                      <ListRowTagPicker
                        entry={renderEntry}
                        onTagsChange={onTagsChange}
                        tags={tags ?? []}
                      />
                    </div>

                    {/* Billable */}
                    <button
                      aria-label={renderEntry.billable ? "Set as non-billable" : "Set as billable"}
                      className={`flex size-[30px] items-center justify-center rounded transition ${
                        renderEntry.billable
                          ? "text-[var(--track-warning-text)]"
                          : "text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={() => onBillableToggle?.(renderEntry)}
                      type="button"
                    >
                      <DollarIcon className="size-4" />
                    </button>

                    {/* Duration */}
                    <button
                      aria-label={`Edit ${renderEntry.description?.trim() || "time entry"}`}
                      className="flex items-center justify-end text-[14px] font-medium tabular-nums"
                      data-testid="time-entry-list-edit-button"
                      onClick={(event) =>
                        onEditEntry?.(renderEntry, event.currentTarget.getBoundingClientRect())
                      }
                      type="button"
                    >
                      <span className="text-[var(--track-text-muted)]">
                        {formatClockDuration(
                          resolveEntryDurationSeconds(renderEntry, nowMs),
                          durationFormat,
                        )}
                      </span>
                    </button>

                    {/* Time range */}
                    <button
                      className="flex items-center justify-end text-[14px] font-medium tabular-nums"
                      onClick={(event) =>
                        onEditEntry?.(renderEntry, event.currentTarget.getBoundingClientRect())
                      }
                      type="button"
                    >
                      <span className="text-[var(--track-text-muted)]">
                        {formatEntryRange(renderEntry, timezone, timeofdayFormat)}
                      </span>
                    </button>

                    {/* Continue */}
                    <div className="flex items-center justify-center">
                      <button
                        aria-label={`Continue ${renderEntry.description?.trim() || "time entry"}`}
                        className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
                        onClick={() => onContinueEntry?.(renderEntry)}
                        type="button"
                      >
                        <PlayIcon className="size-3" />
                      </button>
                    </div>

                    {/* More actions */}
                    <ListRowMoreActions
                      entry={renderEntry}
                      onBillableToggle={onBillableToggle}
                      onContinue={onContinueEntry}
                      onDelete={onDeleteEntry}
                      onDuplicate={onDuplicateEntry}
                      onFavorite={onFavoriteEntry}
                      onSplit={onSplitEntry}
                    />
                  </li>
                );
              });
            })}
          </ul>
        );
      })}

      {hasMore ? (
        <button
          className="mx-auto my-6 flex h-[38px] items-center justify-center rounded-lg border border-[var(--track-border)] px-6 text-[14px] font-medium text-white transition hover:bg-[var(--track-row-hover)] disabled:opacity-50"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Inline description editor — click to edit, blur/Enter to save.
 * Matches Toggl Track's inline textbox behavior.
 */
function InlineDescription({
  entry,
  isRunning,
  onChange,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  isRunning: boolean;
  onChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, description: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const desc = entry.description?.trim() || "";

  const startEditing = () => {
    setDraft(desc);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== desc) {
      onChange?.(entry, draft.trim());
    }
  };

  if (editing) {
    return (
      <input
        className="min-w-0 shrink bg-transparent text-[14px] font-medium text-white outline-none"
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        ref={inputRef}
        type="text"
        value={draft}
      />
    );
  }

  return (
    <button
      className="flex min-w-0 shrink cursor-text items-center gap-2 text-left"
      onClick={startEditing}
      type="button"
    >
      {isRunning ? (
        <span
          className="size-2 shrink-0 rounded-full bg-[var(--track-accent)]"
          style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
        />
      ) : null}
      <p className={`truncate font-medium ${desc ? "" : "text-[var(--track-text-muted)]"}`}>
        <span data-testid="time-entry-description">{desc || "Add description"}</span>
      </p>
    </button>
  );
}

/**
 * Inline tag picker — click tag icon to open dropdown.
 * Always shows the icon (filled when tags exist, muted when empty).
 */
function ListRowTagPicker({
  entry,
  onTagsChange,
  tags,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onTagsChange?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, tagIds: number[]) => void;
  tags: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorTag[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const entryTagIds = entry.tag_ids ?? [];
  const selectedTagIds = useMemo(() => new Set(entryTagIds), [entryTagIds]);
  const hasTags = entryTagIds.length > 0;

  const filteredTags = useMemo(
    () =>
      search.trim()
        ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        : tags,
    [tags, search],
  );

  const tagNames = useMemo(() => {
    if (!hasTags) return "";
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    return entryTagIds.map((id) => tagMap.get(id) ?? `tag-${id}`).join(", ");
  }, [hasTags, entryTagIds, tags]);

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        aria-label="Select tags"
        className={`flex h-[30px] w-full items-center gap-1 overflow-hidden rounded transition ${
          hasTags
            ? "text-[var(--track-text-muted)]"
            : "justify-center text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
        }`}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        {hasTags ? (
          <span className="truncate text-[12px]">{tagNames}</span>
        ) : (
          <TagsIcon className="size-3.5" />
        )}
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <TagPickerDropdown
            filteredTags={filteredTags}
            onSearch={setSearch}
            onToggle={(tagId) => {
              const next = selectedTagIds.has(tagId)
                ? entryTagIds.filter((id) => id !== tagId)
                : [...entryTagIds, tagId];
              onTagsChange?.(entry, next);
            }}
            search={search}
            selectedTagIds={selectedTagIds}
          />
        </div>
      ) : null}
    </div>
  );
}

function ListRowMoreActions({
  entry,
  onBillableToggle,
  onContinue: _onContinue,
  onDelete,
  onDuplicate,
  onFavorite,
  onSplit,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onContinue?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDelete?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDuplicate?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onFavorite?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onSplit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
}) {
  const label = entry.description?.trim() || "time entry";

  return (
    <DropdownMenu
      minWidth="200px"
      trigger={
        <button
          aria-label={`More actions for ${label}`}
          className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
          type="button"
        >
          <MoreIcon className="size-3" />
        </button>
      }
    >
      <MenuItem onClick={() => onBillableToggle?.(entry)}>
        {entry.billable ? "Set as non-billable" : "Set as billable"}
      </MenuItem>
      <MenuItem onClick={() => onDuplicate?.(entry)}>Duplicate</MenuItem>
      {entry.start && entry.stop ? (
        <MenuItem onClick={() => onSplit?.(entry)}>Split</MenuItem>
      ) : null}
      {entry.project_id || entry.pid ? (
        <MenuLink
          href={`/projects/${entry.workspace_id ?? entry.wid}/edit/${resolveTimeEntryProjectId(entry)}`}
        >
          Go to project
        </MenuLink>
      ) : null}
      <MenuItem onClick={() => onFavorite?.(entry)}>Pin as favorite</MenuItem>
      <MenuItem onClick={() => void navigator.clipboard.writeText(entry.description?.trim() ?? "")}>
        Copy description
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (typeof entry.id === "number") {
            const startLink = `${window.location.origin}/timer?entry=${entry.id}`;
            void navigator.clipboard.writeText(startLink);
          }
        }}
      >
        Copy start link
      </MenuItem>
      <MenuSeparator />
      <MenuItem destructive onClick={() => onDelete?.(entry)}>
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}

/**
 * Project picker — shows project name (clickable to open picker)
 * and a hover-only folder icon when no project is set.
 */
function ListRowProjectPicker({
  entry,
  onProjectChange,
  projects,
  workspaceName,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  projects: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorProject[];
  workspaceName: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasProject = !!entry.project_name;

  return (
    <div className="relative" ref={containerRef}>
      {hasProject ? (
        <button
          aria-label={`Change project for ${entry.description?.trim() || "time entry"}`}
          className="flex cursor-pointer items-center gap-1.5 overflow-hidden text-[14px] font-medium"
          onClick={() => setOpen((prev) => !prev)}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          type="button"
        >
          <span
            className="size-[9px] shrink-0 rounded-full"
            style={{ backgroundColor: resolveEntryColor(entry) }}
          />
          <span className="max-w-[180px] truncate" style={{ color: resolveEntryColor(entry) }}>
            {entry.project_name}
          </span>
          {entry.client_name ? (
            <span className="text-[var(--track-text-muted)]">
              <span className="mx-0.5">·</span>
              <span>{entry.client_name}</span>
            </span>
          ) : null}
        </button>
      ) : (
        <button
          aria-label="Add a project"
          className="flex size-6 items-center justify-center rounded text-[var(--track-text-muted)] opacity-0 transition hover:bg-[var(--track-row-hover)] hover:text-white group-hover:opacity-100"
          onClick={() => setOpen((prev) => !prev)}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          type="button"
        >
          <ProjectsIcon className="size-3.5" />
        </button>
      )}
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ProjectPickerDropdown
            onSelect={(projectId) => {
              setOpen(false);
              onProjectChange?.(entry, projectId);
            }}
            projects={projects}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}

export type CalendarContextMenuAction =
  | "copy-description"
  | "copy-start-link"
  | "delete"
  | "duplicate"
  | "favorite"
  | "go-to-project"
  | "split";

export function CalendarView({
  calendarHours = "all",
  draftEntry,
  entries,
  nowMs,
  isEntryFavorited,
  onContextMenuAction,
  onContinueEntry,
  onMoveEntry,
  onEditEntry,
  onResizeEntry,
  onSelectSlot,
  onSelectSubviewDate,
  onStartEntry,
  onZoomIn,
  onZoomOut,
  runningEntry,
  selectedSubviewDateIso,
  subview = "week",
  timezone,
  weekDays,
  weekStartsOn = 1,
  zoom = 0,
}: {
  calendarHours?: "all" | "business";
  draftEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  isEntryFavorited?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => boolean;
  onContextMenuAction?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    action: CalendarContextMenuAction,
  ) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onMoveEntry?: (entryId: number, minutesDelta: number) => void;
  nowMs?: number;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onResizeEntry?: (entryId: number, edge: "start" | "end", minutesDelta: number) => void;
  onSelectSlot?: (slot: { end: Date; start: Date }) => void;
  onSelectSubviewDate?: (dateIso: string) => void;
  onStartEntry?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  runningEntry?: GithubComTogglTogglApiInternalModelsTimeEntry | null;
  selectedSubviewDateIso?: string;
  subview?: CalendarSubview;
  timezone: string;
  weekDays: Date[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  zoom?: number;
}): ReactElement {
  const now = new Date(nowMs ?? Date.now());
  const calendarLocalizer = useMemo(() => buildCalendarLocalizer(weekStartsOn), [weekStartsOn]);
  const calendarDate = useMemo(() => {
    if (subview === "day" && selectedSubviewDateIso) {
      return new Date(`${selectedSubviewDateIso}T00:00:00`);
    }
    return weekDays[0] ?? now;
  }, [now, selectedSubviewDateIso, subview, weekDays]);
  // Build stopped/draft events without nowMs so they stay referentially
  // stable while a timer is running (nowMs ticks every second).
  const stoppedEvents = useMemo<CalendarEvent[]>(() => {
    const DRAFT_ENTRY_ID = -1;

    const calendarEvents: CalendarEvent[] = entries
      .filter(
        (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
          typeof entry.id === "number" &&
          Boolean(entry.start ?? entry.at) &&
          !isRunningTimeEntry(entry),
      )
      .flatMap((entry) => {
        const start = new Date(entry.start ?? entry.at ?? Date.now());
        const end = new Date(entry.stop!);
        const resource = {
          color: resolveEntryColor(entry),
          isDraft: false,
          isLocked: false,
          isRunning: false,
        };
        const title = entry.description?.trim() || entry.project_name || "Entry";

        // Split cross-day entries at each midnight boundary so they render as
        // time-grid blocks instead of all-day header events.
        return splitAtMidnight(start, end).map((segment) => ({
          allDay: false,
          end: segment.end,
          entry,
          id: entry.id,
          resource,
          start: segment.start,
          title,
        }));
      });

    if (draftEntry != null && draftEntry.start) {
      const draftWithId = {
        ...draftEntry,
        id: DRAFT_ENTRY_ID,
      } as GithubComTogglTogglApiInternalModelsTimeEntry & { id: number };
      const start = new Date(draftWithId.start ?? Date.now());
      const end = draftWithId.stop ? new Date(draftWithId.stop) : start;
      calendarEvents.push({
        allDay: false,
        end,
        entry: draftWithId,
        id: draftWithId.id,
        resource: {
          color: resolveEntryColor(draftWithId),
          isDraft: true,
          isLocked: false,
          isRunning: false,
        },
        start,
        title: draftWithId.description?.trim() || draftWithId.project_name || "Entry",
      });
    }

    return calendarEvents;
  }, [draftEntry, entries]);

  // Toggl updates running entries in the calendar every ~60 seconds, not every
  // second. This prevents RBC from re-rendering all event components on every
  // tick, which would destroy local state (e.g. context menu) in EventCards.
  // We round nowMs down to the nearest minute so the events array only changes
  // when the minute rolls over.
  const nowMinuteMs = useMemo(() => {
    if (nowMs == null) return undefined;
    return Math.floor(nowMs / 60_000) * 60_000;
  }, [nowMs]);

  const events = useMemo<CalendarEvent[]>(() => {
    // Include the running entry even if the time-entries query hasn't yet
    // returned it (e.g. immediately after starting a new timer).
    const entryIds = new Set(entries.map((e) => e.id));
    const runningEntries: GithubComTogglTogglApiInternalModelsTimeEntry[] = [];
    if (
      runningEntry != null &&
      typeof runningEntry.id === "number" &&
      !entryIds.has(runningEntry.id)
    ) {
      runningEntries.push(runningEntry);
    }
    // Also pick up any running entries already in the entries list
    for (const entry of entries) {
      if (typeof entry.id === "number" && isRunningTimeEntry(entry)) {
        runningEntries.push(entry);
      }
    }

    if (runningEntries.length === 0) {
      return stoppedEvents;
    }

    const runningEvents: CalendarEvent[] = runningEntries
      .filter(
        (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
          typeof entry.id === "number" && Boolean(entry.start ?? entry.at),
      )
      .flatMap((entry) => {
        const start = new Date(entry.start ?? entry.at ?? Date.now());
        // Running entry end is "now" rounded to the current minute.
        // This matches Toggl's behavior: calendar events update every ~60s,
        // not every second, so RBC doesn't re-render and destroy event cards.
        const end = new Date(nowMinuteMs ?? Date.now());
        const resource = {
          color: resolveEntryColor(entry),
          isDraft: false,
          isLocked: false,
          isRunning: true,
        };
        const title = entry.description?.trim() || entry.project_name || "Entry";

        return splitAtMidnight(start, end).map((segment) => ({
          allDay: false,
          end: segment.end,
          entry,
          id: entry.id,
          resource,
          start: segment.start,
          title,
        }));
      });

    return [...stoppedEvents, ...runningEvents];
  }, [stoppedEvents, entries, nowMinuteMs, runningEntry]);
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    for (const day of weekDays) {
      const key = dateFormatter.format(day);
      totals.set(key, sumForDate(entries, key, timezone));
    }
    return totals;
  }, [entries, weekDays, timezone]);

  const today = useMemo(() => new Date(), []);

  const currentView =
    subview === "day" ? Views.DAY : subview === "five-day" ? Views.WORK_WEEK : Views.WEEK;
  const minTime = useMemo(() => {
    const date = new Date(calendarDate);
    date.setHours(calendarHours === "business" ? 9 : 0, 0, 0, 0);
    return date;
  }, [calendarDate, calendarHours]);
  const maxTime = useMemo(() => {
    const date = new Date(calendarDate);
    if (calendarHours === "business") {
      date.setHours(17, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }, [calendarDate, calendarHours]);
  const step = zoom > 0 ? 15 : 30;
  const timeslots = zoom > 0 ? 4 : 2;

  // Context menu state lives at CalendarView level (not inside EventCard).
  // Toggl does the same — the menu is a sibling of the calendar grid in the
  // DOM, not inside the event card. This way RBC can re-render event cards
  // without destroying the menu state.
  const [contextMenuState, setContextMenuState] = useState<{
    entry: GithubComTogglTogglApiInternalModelsTimeEntry;
    x: number;
    y: number;
  } | null>(null);

  // Memoize the RBC components object so it doesn't change on every render.
  // Without this, every nowMs tick (1s) creates a new components object →
  // RBC re-mounts all event cards → local state (context menu) is lost.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendarComponents = useMemo(
    () => ({
      event: (props: EventProps<CalendarEvent>) => (
        <CalendarEventCard
          event={props.event}
          onContextMenu={(entry, x, y) => setContextMenuState({ entry, x, y })}
          onContinueEntry={onContinueEntry}
          onEditEntry={onEditEntry}
        />
      ),
      header: ({ date }: { date: Date }) => {
        const dayNum = date.getDate();
        const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" })
          .format(date)
          .toUpperCase();
        const dateKey = new Intl.DateTimeFormat("en-CA", {
          day: "2-digit",
          month: "2-digit",
          timeZone: timezone,
          year: "numeric",
        }).format(date);
        const totalSeconds = dailyTotals.get(dateKey) ?? 0;
        const isToday =
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate();
        return (
          <div
            className="flex w-full items-center gap-2 px-2 py-2"
            data-testid={`calendar-day-header-${dayName.toLowerCase()}`}
          >
            <span
              className={`flex h-[32px] w-[36px] items-center justify-center text-[22px] font-semibold leading-none ${
                isToday ? "rounded-full bg-[var(--track-accent)]/30 text-white p-2" : "text-white"
              }`}
            >
              {dayNum}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isToday ? "text-[var(--track-accent)]" : "text-[var(--track-text-soft)]"
                }`}
              >
                {dayName}
              </span>
              <span className="text-[11px] tabular-nums text-[var(--track-text-soft)]">
                {totalSeconds > 0 ? formatDayTotal(totalSeconds) : "0:00:00"}
              </span>
            </span>
          </div>
        );
      },
      timeGutterHeader: () => (
        <div
          className="flex items-center justify-center gap-1 py-2"
          data-testid="calendar-zoom-controls"
        >
          <button
            aria-label="Decrease zoom"
            className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={zoom <= -1}
            onClick={onZoomOut}
            type="button"
          >
            <MinusIcon className="size-3" />
          </button>
          <button
            aria-label="Increase zoom"
            className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={zoom >= 1}
            onClick={onZoomIn}
            type="button"
          >
            <PlusIcon className="size-3" />
          </button>
        </div>
      ),
      dayColumnWrapper: React.forwardRef<HTMLDivElement, Record<string, unknown>>(
        function DayColumnWrapperBridge(props, ref) {
          return (
            <CalendarDayColumnWrapper
              ref={ref}
              className={props.className as string | undefined}
              isNow={Boolean(
                typeof props.className === "string" &&
                (props.className as string).includes("rbc-now"),
              )}
              onStartEntry={onStartEntry}
              style={props.style as React.CSSProperties | undefined}
            >
              {props.children as React.ReactNode}
            </CalendarDayColumnWrapper>
          );
        },
      ),
    }),
    [
      onContextMenuAction,
      onContinueEntry,
      onEditEntry,
      timezone,
      dailyTotals,
      today,
      zoom,
      onZoomIn,
      onZoomOut,
      onStartEntry,
    ],
  );

  return (
    <div
      className="border-t border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="timer-calendar-view"
    >
      <DnDCalendar
        components={calendarComponents}
        date={calendarDate}
        defaultView={Views.WEEK}
        getNow={() => new Date()}
        draggableAccessor={(event) =>
          !event.resource.isLocked && !event.resource.isRunning && !event.resource.isDraft
        }
        endAccessor={(event) => event.end}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dayLayoutAlgorithm={calendarDayLayout as any}
        eventPropGetter={(event) => ({
          className: event.resource.isRunning ? "rbc-event-running" : undefined,
          style: {
            backgroundColor: "transparent",
            border: event.resource.isDraft ? "1px dashed var(--track-accent-outline)" : "none",
            color: "var(--track-text)",
            opacity: event.resource.isDraft ? 0.7 : undefined,
          },
        })}
        events={events}
        localizer={calendarLocalizer}
        max={maxTime}
        messages={{
          day: "Day",
          next: "Next",
          previous: "Previous",
          today: "Today",
          week: "Week",
        }}
        min={minTime}
        onDrillDown={(date) => onSelectSubviewDate?.(formatDateIso(date))}
        onEventDrop={({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
          const nextStart = new Date(start);
          const nextEnd = new Date(end);
          const minutesDelta = Math.round((nextStart.getTime() - event.start.getTime()) / 60_000);
          if (minutesDelta !== 0) {
            void onMoveEntry?.(event.id, minutesDelta);
          }
          if (event.entry.stop && nextEnd.getTime() !== event.end.getTime()) {
            void onResizeEntry?.(
              event.id,
              "end",
              Math.round((nextEnd.getTime() - event.end.getTime()) / 60_000),
            );
          }
          (window as Window & { __calendarDragResult?: unknown }).__calendarDragResult = {
            eventId: event.id,
            minutesDelta,
            start: nextStart.toISOString(),
            end: nextEnd.toISOString(),
          };
        }}
        onEventResize={({ end, event, start }: EventInteractionArgs<CalendarEvent>) => {
          const nextStart = new Date(start);
          const nextEnd = new Date(end);
          const startDelta = Math.round((nextStart.getTime() - event.start.getTime()) / 60_000);
          const endDelta = Math.round((nextEnd.getTime() - event.end.getTime()) / 60_000);
          if (startDelta !== 0) {
            void onResizeEntry?.(event.id, "start", startDelta);
          } else if (endDelta !== 0) {
            void onResizeEntry?.(event.id, "end", endDelta);
          }
        }}
        onNavigate={() => undefined}
        onSelectEvent={(event, nativeEvent) => {
          const target = nativeEvent.currentTarget;
          if (target instanceof HTMLElement) {
            onEditEntry?.(event.entry, target.getBoundingClientRect());
          }
        }}
        onSelectSlot={(slotInfo: SlotInfo) => {
          if (slotInfo.start && slotInfo.end) {
            onSelectSlot?.({
              end: slotInfo.end,
              start: slotInfo.start,
            });
          }
        }}
        resizable
        resizableAccessor={(event) =>
          !event.resource.isLocked && !event.resource.isRunning && !event.resource.isDraft
        }
        selectable
        startAccessor={(event) => event.start}
        step={step}
        timeslots={timeslots}
        toolbar={false}
        onView={() => undefined}
        view={currentView}
        views={[Views.WEEK, Views.WORK_WEEK, Views.DAY]}
      />
      {/* Context menu rendered at CalendarView level (sibling of DnDCalendar),
          matching Toggl's architecture. Menu state survives event card re-renders. */}
      {contextMenuState ? (
        <CalendarEntryContextMenu
          entry={contextMenuState.entry}
          onClose={() => setContextMenuState(null)}
          onCopyDescription={() => {
            onContextMenuAction?.(contextMenuState.entry, "copy-description");
            setContextMenuState(null);
          }}
          onCopyStartLink={() => {
            onContextMenuAction?.(contextMenuState.entry, "copy-start-link");
            setContextMenuState(null);
          }}
          onDelete={() => {
            onContextMenuAction?.(contextMenuState.entry, "delete");
            setContextMenuState(null);
          }}
          onDuplicate={() => {
            onContextMenuAction?.(contextMenuState.entry, "duplicate");
            setContextMenuState(null);
          }}
          onFavorite={
            isEntryFavorited?.(contextMenuState.entry)
              ? undefined
              : () => {
                  onContextMenuAction?.(contextMenuState.entry, "favorite");
                  setContextMenuState(null);
                }
          }
          onSplit={
            contextMenuState.entry.stop
              ? () => {
                  onContextMenuAction?.(contextMenuState.entry, "split");
                  setContextMenuState(null);
                }
              : undefined
          }
          position={{ x: contextMenuState.x, y: contextMenuState.y }}
          projectPath={
            contextMenuState.entry.project_id || contextMenuState.entry.pid
              ? `/projects/${contextMenuState.entry.workspace_id ?? contextMenuState.entry.wid}/list`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

export function TimesheetView({
  onAddRow,
  onBillableToggle,
  onCellEdit,
  onCopyLastWeek,
  onDeleteRow,
  rows,
  timezone,
  weekDays,
}: {
  onAddRow?: () => void;
  onBillableToggle?: (projectLabel: string) => void;
  onCellEdit?: (projectLabel: string, dayIndex: number, durationSeconds: number) => void;
  onCopyLastWeek?: () => void;
  onDeleteRow?: (projectLabel: string) => void;
  rows: TimesheetRow[];
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  const totals = weekDays.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.cells[index] ?? 0), 0),
  );
  const weekTotal = rows.reduce((sum, row) => sum + row.totalSeconds, 0);

  return (
    <table
      className="w-full border-collapse"
      data-testid="timer-timesheet-view"
      style={{ tableLayout: "fixed" }}
    >
      <thead>
        <tr className="h-[40px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--track-text-muted)]">
          <th className="text-left pl-5 pr-2" style={{ width: "26%" }}>
            Project
          </th>
          <th className="text-left px-2" style={{ width: "13%" }} />
          {weekDays.map((day) => (
            <th className="text-center px-2" key={day.toISOString()}>
              {formatWeekday(day, timezone)}
            </th>
          ))}
          <th className="text-right px-2" style={{ width: "7%" }}>
            Total
          </th>
          <th style={{ width: "3.5%" }} />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className="group h-[50px] text-[14px] text-white" key={row.label}>
            <td className="pl-5 pr-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="truncate font-medium">{row.label}</span>
              </div>
            </td>
            <td className="px-2">
              <div className="flex items-center gap-1">
                {row.tagNames.length > 0 ? (
                  <span className="truncate text-[12px] text-[var(--track-text-muted)]">
                    {row.tagNames.join(", ")}
                  </span>
                ) : null}
                <button
                  aria-label={row.billable ? "Set as non-billable" : "Set as billable"}
                  className={`ml-auto flex size-[30px] shrink-0 items-center justify-center rounded-lg transition ${
                    row.billable
                      ? "bg-[var(--track-accent)]/10 text-[var(--track-accent)]"
                      : "text-[var(--track-text-muted)] opacity-0 group-hover:opacity-100"
                  }`}
                  onClick={() => onBillableToggle?.(row.label)}
                  type="button"
                >
                  <DollarIcon className="size-4" />
                </button>
              </div>
            </td>
            {row.cells.map((seconds, index) => (
              <td className="px-1 text-center" key={`${row.label}-${index}`}>
                <TimesheetCell
                  onCommit={(durationSeconds) => onCellEdit?.(row.label, index, durationSeconds)}
                  seconds={seconds}
                />
              </td>
            ))}
            <td className="px-2 text-right font-medium tabular-nums">
              {formatTimesheetTotal(row.totalSeconds)}
            </td>
            <td className="pr-2">
              <button
                aria-label={`Delete row ${row.label}`}
                className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
                onClick={() => onDeleteRow?.(row.label)}
                type="button"
              >
                <MoreIcon className="size-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="h-[50px] text-[14px] text-[var(--track-text-muted)]">
          <td className="pl-5" colSpan={2}>
            <button
              className="flex items-center gap-1 font-medium transition hover:text-white"
              onClick={onAddRow}
              type="button"
            >
              <strong className="text-[14px]">+</strong>
              <span>Add row</span>
            </button>
          </td>
          {weekDays.map((_, index) => (
            <td className="px-1 text-center" key={`add-${index}`}>
              <TimesheetCell seconds={0} onCommit={undefined} />
            </td>
          ))}
          <td />
          <td />
        </tr>
        <tr className="h-[50px] text-[14px]">
          <td className="pl-5">
            <button
              className="rounded-md border border-[var(--track-border)] px-3 py-1.5 text-[12px] text-white transition hover:bg-[var(--track-row-hover)]"
              onClick={onCopyLastWeek}
              type="button"
            >
              Copy last week ▾
            </button>
          </td>
          <td className="px-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--track-text-muted)]">
            Total
          </td>
          {totals.map((seconds, index) => (
            <td className="px-2 text-center text-white" key={`total-${index}`}>
              {seconds > 0 ? formatTimesheetTotal(seconds) : "-"}
            </td>
          ))}
          <td className="px-2 text-right font-medium text-white">
            {formatTimesheetTotal(weekTotal)}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function formatTimesheetTotal(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return "0 h";
  if (hours === Math.floor(hours)) return `${hours} h`;
  return `${hours.toFixed(1)} h`;
}

function CalendarEventCard({
  event,
  onContextMenu,
  onContinueEntry,
  onEditEntry,
}: {
  event: CalendarEvent;
  onContextMenu?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    x: number,
    y: number,
  ) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
}) {
  const { durationFormat } = useUserPreferences();
  const entry = event.entry;
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const color = event.resource.color;
  const isRunning = event.resource.isRunning;
  const cardRef = useRef<HTMLDivElement>(null);
  const entryId = event.id;
  const isDraft = event.resource.isDraft;
  const allowDirectEdit = !event.resource.isLocked && !isRunning && !isDraft;

  // Draft entries auto-open the editor anchored to their real DOM position
  useEffect(() => {
    if (!isDraft || !cardRef.current) return;
    onEditEntry?.(entry, cardRef.current.getBoundingClientRect());
  }, [isDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={cardRef}
      className={`group h-full ${allowDirectEdit ? "cursor-grab" : "cursor-default"}`}
      data-testid={`calendar-entry-${entryId ?? "unknown"}`}
      onClick={(e) => onEditEntry?.(entry, e.currentTarget.getBoundingClientRect())}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(entry, e.clientX, e.clientY);
      }}
    >
      {/* Inner EventBox — Toggl uses padding 4px 6px for entries ≥15min,
          0px for shorter ones. border-radius 4px always. */}
      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[4px] text-left text-[12px] text-[var(--track-text)] ${
          durationSeconds >= 900 ? "px-1.5 py-1" : "px-0 py-0"
        }`}
        style={{
          backgroundColor: colorToOverlay(color),
          backgroundImage: isRunning
            ? "repeating-linear-gradient(135deg, transparent 0 10px, var(--track-border-soft) 10px 20px)"
            : undefined,
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={`truncate font-semibold leading-tight ${entry.description?.trim() ? "" : "text-[var(--track-text-muted)]"}`}
          >
            {entry.description?.trim() || "Add description"}
          </span>
          {entry.project_name ? (
            <span
              className="truncate text-[12px] font-medium leading-tight"
              style={{ color: vividColor(color) }}
            >
              {entry.project_name}
            </span>
          ) : null}
          {entry.tags && entry.tags.length > 0 ? (
            <span className="flex items-center gap-1 truncate text-[11px] leading-tight text-[var(--track-text-muted)]">
              <TagsIcon className="size-2.5 shrink-0" />
              <span className="truncate">{entry.tags.join(", ")}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[12px] font-semibold tabular-nums leading-tight">
            {formatClockDuration(durationSeconds, durationFormat)}
          </span>
        </div>
        <button
          aria-label="Continue time entry"
          className="absolute bottom-1 right-1 z-20 flex size-5 items-center justify-center rounded-full bg-[var(--track-accent-secondary)] text-[var(--track-surface)] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onContinueEntry?.(entry);
          }}
          type="button"
        >
          <PlayIcon className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayTotal(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function TimesheetCell({
  onCommit,
  seconds,
}: {
  onCommit?: (durationSeconds: number) => void;
  seconds: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function beginEditing() {
    if (!onCommit) return;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    setDraft(`${hours}:${String(minutes).padStart(2, "0")}`);
    setIsEditing(true);
  }

  function commitEdit() {
    setIsEditing(false);
    const parsed = parseTimesheetDuration(draft);
    if (parsed != null && parsed !== seconds) {
      onCommit?.(parsed);
    }
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        className="w-full rounded-md border border-[var(--track-accent)] bg-[var(--track-surface)] px-2 py-1 text-center text-[14px] font-medium tabular-nums text-white outline-none"
        onBlur={commitEdit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setIsEditing(false);
          }
        }}
        type="text"
        value={draft}
      />
    );
  }

  if (seconds > 0) {
    return (
      <span
        className="cursor-pointer rounded-md px-2 py-1 text-[14px] font-medium tabular-nums text-white hover:bg-[var(--track-row-hover)]"
        onClick={beginEditing}
      >
        {formatHours(seconds)}
      </span>
    );
  }

  return (
    <span
      className="block h-[30px] w-full cursor-pointer rounded-lg border border-[var(--track-border)]/40 transition hover:border-[var(--track-border)]"
      onClick={beginEditing}
    />
  );
}

function parseTimesheetDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  // h:mm:ss
  const hmsMatch = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (hmsMatch) {
    return Number(hmsMatch[1]) * 3600 + Number(hmsMatch[2]) * 60 + Number(hmsMatch[3]);
  }

  // h:mm
  const hmMatch = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (hmMatch) {
    return Number(hmMatch[1]) * 3600 + Number(hmMatch[2]) * 60;
  }

  // plain number (hours)
  const numMatch = /^(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (numMatch) {
    return Math.round(Number(numMatch[1]) * 3600);
  }

  return null;
}

function isRunningTimeEntry(entry: GithubComTogglTogglApiInternalModelsTimeEntry): boolean {
  return !entry.stop && typeof entry.duration === "number" && entry.duration < 0;
}

/** Keep the same hue as the project color but boost saturation and lightness for a vivid, readable label. */
function vividColor(color: string): string {
  if (!color?.startsWith("#")) return color ?? "var(--track-accent)";
  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((p) => `${p}${p}`)
          .join("")
      : normalized;
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return `hsl(${h}, 40%, 38%)`;
}

function colorToOverlay(color: string): string {
  if (!color.startsWith("#")) {
    return color;
  }

  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgb(${red}, ${green}, ${blue})`;
}
