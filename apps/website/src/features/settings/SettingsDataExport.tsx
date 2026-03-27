import { ShellSurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useCallback, useMemo, useState } from "react";

import { useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(Math.abs(seconds) / 3600);
  const m = Math.floor((Math.abs(seconds) % 3600) / 60);
  const s = Math.abs(seconds) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildCsv(entries: GithubComTogglTogglApiInternalModelsTimeEntry[]): string {
  const header = "Description,Project,Client,Start,Stop,Duration,Billable,Tags";
  const rows = entries
    .filter((e) => (e.duration ?? 0) >= 0)
    .map((e) => {
      const desc = escapeCsvField(e.description ?? "");
      const project = escapeCsvField(e.project_name ?? "");
      const client = escapeCsvField(e.client_name ?? "");
      const start = e.start ?? "";
      const stop = e.stop ?? "";
      const dur = formatDuration(e.duration ?? 0);
      const billable = e.billable ? "Yes" : "No";
      const tags = escapeCsvField((e.tags ?? []).join(", "));
      return `${desc},${project},${client},${start},${stop},${dur},${billable},${tags}`;
    });
  return [header, ...rows].join("\n");
}

function downloadBlob(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

type ExportFormat = "csv" | "pdf";

export function SettingsDataExport(): ReactElement {
  const [startDate, setStartDate] = useState(thirtyDaysAgoIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);

  const entriesQuery = useTimeEntriesQuery({
    endDate,
    startDate,
  });

  const entryCount = useMemo(() => {
    if (!entriesQuery.data) return 0;
    return entriesQuery.data.filter((e) => (e.duration ?? 0) >= 0).length;
  }, [entriesQuery.data]);

  const handleExport = useCallback(() => {
    if (!entriesQuery.data || entriesQuery.data.length === 0) return;

    setExporting(true);
    try {
      if (format === "csv") {
        const csv = buildCsv(entriesQuery.data);
        downloadBlob(csv, `time-entries-${startDate}-to-${endDate}.csv`);
      } else {
        /* PDF export is not yet supported; fall back to CSV */
        const csv = buildCsv(entriesQuery.data);
        downloadBlob(csv, `time-entries-${startDate}-to-${endDate}.csv`);
      }
    } finally {
      setExporting(false);
    }
  }, [entriesQuery.data, format, startDate, endDate]);

  return (
    <ShellSurfaceCard>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-[16px] font-semibold text-white">Export time entries</h2>
          <p className="mt-1 text-[13px] text-[var(--track-text-muted)]">
            Download your workspace time entries for a selected date range.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[var(--track-text-soft)]">
              Start date
            </span>
            <input
              className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
              data-testid="export-start-date"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[var(--track-text-soft)]">
              End date
            </span>
            <input
              className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white"
              data-testid="export-end-date"
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              value={endDate}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--track-text-soft)]">
            Export format
          </span>
          <select
            className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white sm:w-48"
            data-testid="export-format"
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            value={format}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </label>

        <div className="flex items-center gap-4">
          <button
            className="h-9 rounded-[8px] bg-[var(--track-accent)] px-5 text-[13px] font-semibold text-black disabled:opacity-50"
            data-testid="export-button"
            disabled={exporting || entriesQuery.isPending || entryCount === 0}
            onClick={handleExport}
            type="button"
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
          <span className="text-[13px] text-[var(--track-text-muted)]">
            {entriesQuery.isPending
              ? "Loading entries..."
              : `${entryCount} entries in selected range`}
          </span>
        </div>

        {format === "pdf" ? (
          <p className="text-[12px] text-[var(--track-text-muted)]">
            PDF export is unavailable. The export will download as CSV.
          </p>
        ) : null}
      </div>
    </ShellSurfaceCard>
  );
}
