import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { DollarIcon, MoreIcon } from "../../shared/ui/icons.tsx";
import { formatHours, formatWeekday, type TimesheetRow } from "./overview-data.ts";

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
  const { t } = useTranslation("tracking");
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
            {t("project")}
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
              <span>{t("addRow")}</span>
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
              {t("copyLastWeek")} ▾
            </button>
          </td>
          <td className="px-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--track-text-muted)]">
            {t("total")}
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
