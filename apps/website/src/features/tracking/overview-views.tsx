import { type ReactElement, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDropModule from "react-big-calendar/lib/addons/dragAndDrop";
import type { EventProps, SlotInfo } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { enUS } from "date-fns/locale/en-US";
import "./calendar.css";

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
  type EntryGroup,
  type TimesheetRow,
} from "./overview-data.ts";
import {
  BulkActionToolbar,
  BulkEditDialog,
  DeleteConfirmDialog,
  useListSelection,
} from "./list-bulk-actions.tsx";
import { ProjectPickerDropdown } from "./bulk-edit-pickers.tsx";
import type { CalendarSubview, TimerViewMode } from "./timer-view-mode.ts";
import { TrackingIcon } from "./tracking-icons.tsx";
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
    isLocked: boolean;
    isRunning: boolean;
  };
  start: Date;
  title: string;
};

function buildCalendarLocalizer(weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return dateFnsLocalizer({
    format,
    getDay,
    locales: { "en-US": enUS },
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn }),
  });
}

function CalendarTimeSlotWrapper({
  children,
}: {
  children?: React.ReactNode;
  resource?: unknown;
  value?: Date;
}) {
  return <>{children}</>;
}

export function ToolbarButton({
  icon,
  label,
  suffix,
}: {
  icon: "calendar" | "list";
  label: string;
  suffix: string;
}) {
  return (
    <button
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--track-border)] bg-[#1b1b1b] px-4 text-[12px] font-medium text-white"
      type="button"
    >
      <TrackingIcon className="size-3.5 text-[var(--track-text-muted)]" name={icon} />
      <span>{label}</span>
      <span className="text-[var(--track-text-muted)]">· {suffix}</span>
      <TrackingIcon className="size-3 text-[var(--track-text-muted)]" name="chevron-down" />
    </button>
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
  icon: "grid" | "more" | "settings" | "subscription" | "tags";
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`flex size-9 items-center justify-center rounded-md transition hover:bg-[var(--track-row-hover)] hover:text-white ${
        active ? "text-white" : "text-[var(--track-text-muted)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <TrackingIcon className="size-4" name={icon} />
    </button>
  );
}

const CALENDAR_SUBVIEW_LABELS: Record<CalendarSubview, string> = {
  day: "Day view",
  "five-day": "5 days view",
  week: "Week view",
};

const CALENDAR_SUBVIEW_OPTIONS: CalendarSubview[] = ["week", "five-day", "day"];

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
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Calendar sub-view"
        className="flex h-9 min-w-[118px] items-center justify-between gap-2 rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] px-3 text-[13px] font-medium text-white transition hover:border-[#555]"
        data-testid="calendar-subview-select"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        <span>{CALENDAR_SUBVIEW_LABELS[value]}</span>
        <TrackingIcon className="size-3 text-[var(--track-text-muted)]" name="chevron-down" />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[160px] rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] py-1 shadow-lg"
          role="listbox"
        >
          {CALENDAR_SUBVIEW_OPTIONS.map((option) => (
            <button
              aria-selected={option === value}
              className={`flex w-full items-center px-3 py-2 text-[13px] transition hover:bg-[var(--track-row-hover)] ${
                option === value ? "font-semibold text-[#e57bd9]" : "text-white"
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
      className="flex border border-[var(--track-border)] rounded-lg overflow-hidden"
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
  const dividerClass = targetView !== "calendar" ? "border-l border-[var(--track-border)]" : "";
  return (
    <button
      aria-checked={isSelected}
      className={`px-5 py-1 text-[14px] font-semibold focus-visible:outline-1 focus-visible:outline-offset-1 ${dividerClass} ${
        isSelected ? "bg-[#381e35] text-[#cd7fc2]" : "bg-[#1b1b1b] text-[#fafafa]"
      }`}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onSelect(targetView)}
      role="radio"
      tabIndex={isSelected ? 0 : -1}
      type="button"
    >
      {{ calendar: "Calendar", list: "List view", timesheet: "Timesheet" }[targetView]}
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
  onBillableToggle,
  onBulkDelete,
  onBulkEdit,
  onContinueEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onEditEntry,
  onFavoriteEntry,
  onProjectChange,
  onSplitEntry,
  projects,
  tags,
  timezone,
  workspaceName,
}: {
  groups: EntryGroup[];
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onBulkDelete?: (ids: number[]) => void;
  onBulkEdit?: (ids: number[], updates: import("./list-bulk-actions.tsx").BulkEditUpdates) => void;
  onContinueEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDeleteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDuplicateEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onFavoriteEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onProjectChange?: (
    entry: GithubComTogglTogglApiInternalModelsTimeEntry,
    projectId: number | null,
  ) => void;
  onSplitEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  projects?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorProject[];
  tags?: import("./TimeEntryEditorDialog.tsx").TimeEntryEditorTag[];
  timezone: string;
  workspaceName?: string;
}): ReactElement {
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

  if (groups.length === 0) {
    return <SurfaceMessage message="No time entries in this workspace yet." />;
  }

  return (
    <div className="border-t border-[var(--track-border)]" data-testid="timer-list-view">
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
          <section key={group.key}>
            <div className="grid grid-cols-[28px_minmax(0,1fr)_90px_110px_92px_28px] items-center border-b border-[var(--track-border)] px-6 py-3">
              <input
                aria-label={`Select all entries for ${formatGroupLabel(group.key, timezone)}`}
                checked={groupChecked}
                className={`size-[13px] cursor-pointer appearance-none rounded-[3px] border bg-transparent ${
                  groupChecked || groupIndeterminate
                    ? "border-[#e57bd9] bg-[#e57bd9]"
                    : "border-[var(--track-border)]"
                }`}
                onChange={() => toggleGroup(group)}
                ref={(el) => {
                  if (el) el.indeterminate = groupIndeterminate;
                }}
                type="checkbox"
              />
              <p className="text-[13px] font-medium text-white">
                {formatGroupLabel(group.key, timezone)}
              </p>
              <span />
              <span />
              <p className="text-right text-[12px] font-medium tabular-nums text-white">
                {formatClockDuration(group.totalSeconds)}
              </p>
              <span />
            </div>
            {group.entries.map((entry) => {
              const entryId = entry.id;
              const isSelected = typeof entryId === "number" && selectedIds.has(entryId);
              return (
                <div
                  key={String(entry.id ?? `${entry.start}-${entry.description}`)}
                  className={`group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center border-b border-[var(--track-border)]/30 px-6 py-3 text-[13px] text-white hover:bg-[var(--track-row-hover)] ${
                    isSelected ? "bg-[var(--track-row-hover)]" : ""
                  }`}
                >
                  <input
                    aria-label={`Select ${entry.description?.trim() || "time entry"}`}
                    checked={isSelected}
                    className={`size-[13px] cursor-pointer appearance-none rounded-[3px] border bg-transparent ${
                      isSelected ? "border-[#e57bd9] bg-[#e57bd9]" : "border-[var(--track-border)]"
                    }`}
                    onChange={() => {
                      if (typeof entryId === "number") toggleEntry(entryId);
                    }}
                    type="checkbox"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-4"
                      onClick={(event) =>
                        onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${entry.description?.trim() ? "" : "text-[var(--track-text-muted)]"}`}
                        >
                          {entry.description?.trim() || "Add description"}
                        </p>
                      </div>
                      {entry.project_name ? (
                        <span
                          className="flex shrink-0 items-center gap-1.5 text-[12px]"
                          style={{ color: resolveEntryColor(entry) }}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: resolveEntryColor(entry) }}
                          />
                          <span className="max-w-[160px] truncate">{entry.project_name}</span>
                        </span>
                      ) : null}
                    </div>
                    <ListRowProjectPicker
                      entry={entry}
                      onProjectChange={onProjectChange}
                      projects={projects ?? []}
                      workspaceName={workspaceName ?? "Workspace"}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-4">
                    {entry.tags && entry.tags.length > 0 ? (
                      <TrackingIcon
                        className="size-3.5 text-[var(--track-text-muted)]"
                        name="tags"
                      />
                    ) : null}
                    {entry.billable ? (
                      <span className="text-[12px] font-semibold text-[var(--track-text-muted)]">
                        $
                      </span>
                    ) : null}
                    <span className="whitespace-nowrap text-right text-[14px] font-medium tabular-nums text-[var(--track-text-muted)]">
                      {formatEntryRange(entry, timezone)}
                    </span>
                    <span className="w-[72px] text-right text-[13px] font-normal tabular-nums">
                      {formatClockDuration(resolveEntryDurationSeconds(entry))}
                    </span>
                    <button
                      aria-label={`Continue ${entry.description?.trim() || "time entry"}`}
                      className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
                      onClick={() => onContinueEntry?.(entry)}
                      type="button"
                    >
                      <TrackingIcon className="size-3" name="play" />
                    </button>
                    <ListRowMoreActions
                      entry={entry}
                      onBillableToggle={onBillableToggle}
                      onDelete={onDeleteEntry}
                      onDuplicate={onDuplicateEntry}
                      onFavorite={onFavoriteEntry}
                      onSplit={onSplitEntry}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function ListRowMoreActions({
  entry,
  onBillableToggle,
  onDelete,
  onDuplicate,
  onFavorite,
  onSplit,
}: {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  onBillableToggle?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDelete?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onDuplicate?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onFavorite?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
  onSplit?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = entry.description?.trim() || "time entry";

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={`More actions for ${label}`}
        className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100"
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        type="button"
      >
        <TrackingIcon className="size-3" name="more" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[180px] rounded-lg border border-[var(--track-border)] bg-[#1b1b1b] py-1 shadow-lg"
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              onBillableToggle?.(entry);
            }}
            role="menuitem"
            type="button"
          >
            {entry.billable ? "Set as non-billable" : "Set as billable"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              onDuplicate?.(entry);
            }}
            role="menuitem"
            type="button"
          >
            Duplicate
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              onSplit?.(entry);
            }}
            role="menuitem"
            type="button"
          >
            Split
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              onFavorite?.(entry);
            }}
            role="menuitem"
            type="button"
          >
            Pin as favorite
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              // Copy the entry start time as a link
              const startLink = `${window.location.origin}/timer?start=${entry.start ?? ""}`;
              void navigator.clipboard.writeText(startLink);
            }}
            role="menuitem"
            type="button"
          >
            Copy start link
          </button>
          <div className="my-1 border-t border-[var(--track-border)]" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-rose-400 transition hover:bg-[var(--track-row-hover)]"
            onClick={() => {
              setOpen(false);
              onDelete?.(entry);
            }}
            role="menuitem"
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const label = entry.description?.trim() || "time entry";

  const filteredProjects = useMemo(
    () =>
      search.trim()
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              (p.clientName ?? "").toLowerCase().includes(search.toLowerCase()),
          )
        : projects,
    [projects, search],
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={`Change project for ${label}`}
        className="flex size-6 items-center justify-center rounded text-[var(--track-text-muted)] opacity-0 transition hover:bg-[var(--track-row-hover)] hover:text-white group-hover:opacity-100"
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
        <TrackingIcon className="size-3.5" name="projects" />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[280px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ProjectPickerDropdown
            filteredProjects={filteredProjects}
            onSearch={setSearch}
            onSelect={(projectId) => {
              setOpen(false);
              onProjectChange?.(entry, projectId);
            }}
            search={search}
            workspaceName={workspaceName}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CalendarView({
  entries,
  nowMs,
  onMoveEntry,
  onEditEntry,
  onResizeEntry,
  onSelectSlot,
  onSelectSubviewDate,
  onZoomIn,
  onZoomOut,
  selectedSubviewDateIso,
  subview = "week",
  timezone,
  weekDays,
  weekStartsOn = 1,
  zoom = 0,
}: {
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  onMoveEntry?: (entryId: number, minutesDelta: number) => void;
  nowMs?: number;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
  onResizeEntry?: (entryId: number, edge: "start" | "end", minutesDelta: number) => void;
  onSelectSlot?: (slot: { dayIso: string; minute: number }) => void;
  onSelectSubviewDate?: (dateIso: string) => void;
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
  const events = useMemo<CalendarEvent[]>(
    () =>
      entries
        .filter(
          (entry): entry is GithubComTogglTogglApiInternalModelsTimeEntry & { id: number } =>
            typeof entry.id === "number" && Boolean(entry.start ?? entry.at),
        )
        .map((entry) => {
          const start = new Date(entry.start ?? entry.at ?? Date.now());
          const end = entry.stop
            ? new Date(entry.stop)
            : new Date(start.getTime() + resolveEntryDurationSeconds(entry, nowMs) * 1000);

          return {
            allDay: false,
            end,
            entry,
            id: entry.id,
            resource: {
              color: resolveEntryColor(entry),
              isLocked: false,
              isRunning: isRunningTimeEntry(entry),
            },
            start,
            title: entry.description?.trim() || entry.project_name || "Entry",
          };
        }),
    [entries, nowMs],
  );
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
    date.setHours(0, 0, 0, 0);
    return date;
  }, [calendarDate]);
  const maxTime = useMemo(() => {
    const date = new Date(calendarDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [calendarDate]);
  const step = zoom > 0 ? 15 : 30;
  const timeslots = zoom > 0 ? 4 : 2;

  return (
    <div
      className="flex h-full min-h-0 flex-col border-t border-[var(--track-border)] bg-[#1b1b1b]"
      data-testid="timer-calendar-view"
    >
      <div className="min-h-0 flex-1 overflow-auto" data-testid="calendar-grid-scroll-area">
        <DnDCalendar
          components={{
            event: (props: EventProps<CalendarEvent>) => (
              <CalendarEventCard event={props.event} onEditEntry={onEditEntry} />
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
                <div className="flex w-full items-center gap-2 px-2 py-2">
                  <span
                    className={`flex size-[32px] items-center justify-center text-[22px] font-semibold leading-none ${
                      isToday ? "rounded-full bg-[#e57bd9] text-white" : "text-white"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span
                      className={`text-[10px] font-medium tracking-wide ${
                        isToday ? "text-[#e57bd9]" : "text-[#999]"
                      }`}
                    >
                      {dayName}
                    </span>
                    <span className="text-[10px] tabular-nums text-[#999]">
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
                  className="flex size-6 items-center justify-center rounded text-[#999] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={zoom <= -1}
                  onClick={onZoomOut}
                  type="button"
                >
                  <TrackingIcon className="size-3" name="minus" />
                </button>
                <button
                  aria-label="Increase zoom"
                  className="flex size-6 items-center justify-center rounded text-[#999] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={zoom >= 1}
                  onClick={onZoomIn}
                  type="button"
                >
                  <TrackingIcon className="size-3" name="plus" />
                </button>
              </div>
            ),
            timeSlotWrapper: CalendarTimeSlotWrapper,
          }}
          date={calendarDate}
          defaultView={Views.WEEK}
          getNow={() => now}
          draggableAccessor={(event) => !event.resource.isLocked && !event.resource.isRunning}
          endAccessor={(event) => event.end}
          eventPropGetter={(event) => ({
            className: event.resource.isRunning ? "rbc-event-running" : undefined,
            style: {
              backgroundColor: colorToOverlay(event.resource.color),
              border: "none",
              color: "#fafafa",
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
          onSelectSlot={({ slots }: SlotInfo) => {
            const first = slots[0];
            if (first) {
              onSelectSlot?.({
                dayIso: formatDateIso(first),
                minute: first.getHours() * 60 + first.getMinutes(),
              });
            }
          }}
          resizable
          resizableAccessor={(event) => !event.resource.isLocked && !event.resource.isRunning}
          selectable
          startAccessor={(event) => event.start}
          step={step}
          timeslots={timeslots}
          toolbar={false}
          view={currentView}
          views={[Views.WEEK, Views.WORK_WEEK, Views.DAY]}
        />
      </div>
    </div>
  );
}

export function TimesheetView({
  onCellEdit,
  rows,
  timezone,
  weekDays,
}: {
  onCellEdit?: (projectLabel: string, dayIndex: number, durationSeconds: number) => void;
  rows: TimesheetRow[];
  timezone: string;
  weekDays: Date[];
}): ReactElement {
  const totals = weekDays.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.cells[index] ?? 0), 0),
  );
  const weekTotal = rows.reduce((sum, row) => sum + row.totalSeconds, 0);

  if (rows.length === 0) {
    return <SurfaceMessage message="No week data available for this workspace." />;
  }

  return (
    <div className="border-t border-[var(--track-border)] px-4" data-testid="timer-timesheet-view">
      <div className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] border-b border-[var(--track-border)] py-4 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        <span>Project</span>
        {weekDays.map((day) => (
          <span className="text-center" key={day.toISOString()}>
            {formatWeekday(day, timezone)}
          </span>
        ))}
        <span className="text-right">Total</span>
      </div>
      {rows.map((row) => (
        <div
          className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] items-center border-b border-[var(--track-border)] py-3"
          key={row.label}
        >
          <div className="flex min-w-0 items-center gap-2 pr-4">
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate text-[12px] text-white">{row.label}</span>
          </div>
          {row.cells.map((seconds, index) => (
            <div className="flex justify-center" key={`${row.label}-${index}`}>
              <TimesheetCell
                onCommit={(durationSeconds) => onCellEdit?.(row.label, index, durationSeconds)}
                seconds={seconds}
              />
            </div>
          ))}
          <span className="text-right text-[12px] font-medium text-white">
            {formatHours(row.totalSeconds)}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] items-center border-b border-[var(--track-border)] py-3 text-[12px] text-[var(--track-text-muted)]">
        <button
          className="flex items-center gap-2 text-left transition hover:text-white"
          type="button"
        >
          <TrackingIcon className="size-3.5" name="plus" />
          <span>Add row</span>
        </button>
        {weekDays.map((_, index) => (
          <div className="flex justify-center" key={`placeholder-${index}`}>
            <TimesheetCell seconds={0} onCommit={undefined} />
          </div>
        ))}
        <span />
      </div>
      <div className="grid grid-cols-[minmax(280px,1fr)_repeat(7,55px)_72px] items-center py-3 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        <div className="flex items-center gap-4">
          <button
            className="w-fit rounded-md border border-[var(--track-border)] bg-[#171717] px-3 py-2 text-[11px] normal-case tracking-normal text-white transition hover:bg-[var(--track-row-hover)]"
            type="button"
          >
            Copy last week
          </button>
          <span>Total</span>
        </div>
        {totals.map((seconds, index) => (
          <span className="text-center text-white" key={`total-${index}`}>
            {seconds > 0 ? formatHours(seconds) : "-"}
          </span>
        ))}
        <span className="text-right text-white">{formatHours(weekTotal)}</span>
      </div>
    </div>
  );
}

function CalendarEventCard({
  event,
  onEditEntry,
}: {
  event: CalendarEvent;
  onEditEntry?: (entry: GithubComTogglTogglApiInternalModelsTimeEntry, anchorRect: DOMRect) => void;
}) {
  const entry = event.entry;
  const durationSeconds = resolveEntryDurationSeconds(entry);
  const color = event.resource.color;
  const isRunning = event.resource.isRunning;
  const [affordancesOpen, setAffordancesOpen] = useState(false);
  const entryId = event.id;
  const allowDirectEdit = !event.resource.isLocked && !isRunning;

  return (
    <div
      className={`group h-full overflow-hidden rounded-none border-none px-1.5 py-1 text-left text-[14px] font-medium leading-[1.15] text-white transition hover:brightness-110 ${
        allowDirectEdit ? "cursor-grab" : "cursor-default"
      }`}
      data-testid={`calendar-entry-${entryId ?? "unknown"}`}
      style={{
        backgroundColor: colorToOverlay(color),
        backgroundImage: isRunning
          ? "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.08) 10px 20px)"
          : undefined,
        animation: "fadeIn 0.15s linear",
        overflow: "visible",
      }}
    >
      <button
        aria-label={`Edit ${entry.description?.trim() || entry.project_name || "time entry"}`}
        className="relative z-10 flex h-full w-full items-start gap-1 text-left text-[11px] text-white"
        data-testid={`calendar-entry-move-${entryId}`}
        onClick={(event) => onEditEntry?.(entry, event.currentTarget.getBoundingClientRect())}
        type="button"
      >
        <span
          className={`truncate font-medium leading-tight ${entry.description?.trim() ? "" : "text-[var(--track-text-muted)]"}`}
        >
          {entry.description?.trim() || "Add description"}
        </span>
        {entry.project_name ? (
          <span className="shrink-0 leading-tight text-white/70">
            {entry.project_name}
            {entry.client_name ? ` \u2022 ${entry.client_name}` : ""}
          </span>
        ) : null}
        <span className="shrink-0 text-[12px] font-semibold tabular-nums leading-tight text-white/70">
          {formatClockDuration(durationSeconds)}
        </span>
        {entry.billable ? (
          <span className="shrink-0 font-semibold leading-tight text-white/70">$</span>
        ) : null}
        {entry.tags && entry.tags.length > 0 ? (
          <span className="shrink-0 leading-tight text-white/70">{entry.tags[0]}</span>
        ) : null}
      </button>
      <button
        aria-label={`Entry actions for ${entry.description?.trim() || entry.project_name || "time entry"}`}
        className="absolute right-1 top-1 z-20 flex size-4 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white"
        onClick={() => setAffordancesOpen((current) => !current)}
        type="button"
      >
        <TrackingIcon className="size-3" name="more" />
      </button>
      {allowDirectEdit ? (
        <button
          aria-label={`Resize end for ${entry.description?.trim() || entry.project_name || "time entry"}`}
          className="absolute inset-x-2 bottom-0 z-20 h-2 cursor-row-resize rounded-b bg-white/20 opacity-0 transition hover:opacity-100"
          data-testid={`calendar-entry-resize-end-${entryId}`}
          type="button"
        />
      ) : null}
      {affordancesOpen ? (
        <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1 rounded-[6px] bg-[#141415]/95 p-1">
          <span className="px-1.5 py-0.5 text-[9px] text-white/70">
            {allowDirectEdit ? "Drag or resize to adjust" : "Running entries are view-only here"}
          </span>
        </div>
      ) : null}
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    setDraft(
      secs > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        : `${hours}:${String(minutes).padStart(2, "0")}`,
    );
    setIsEditing(true);
  }

  function commitEdit() {
    setIsEditing(false);
    const parsed = parseTimesheetDuration(draft);
    if (parsed != null && parsed !== seconds) {
      onCommit?.(parsed);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        className="flex h-5 min-w-[36px] w-[52px] items-center justify-center rounded-[6px] border border-[#e57bd9] bg-[#202020] px-1 text-center text-[10px] font-medium text-white outline-none"
        onBlur={commitEdit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
        }}
        type="text"
        value={draft}
      />
    );
  }

  return (
    <span
      className={`flex h-5 min-w-[36px] cursor-pointer items-center justify-center rounded-[6px] border px-2 text-[10px] font-medium ${
        seconds > 0
          ? "border-[#4a4a4a] bg-[#202020] text-white hover:border-[#666]"
          : "border-[#3b3b3b] bg-transparent text-transparent hover:border-[#555] hover:text-[var(--track-text-muted)]"
      }`}
      onClick={beginEditing}
    >
      {seconds > 0 ? formatHours(seconds) : "0:00"}
    </span>
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

function colorToOverlay(color: string): string {
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
