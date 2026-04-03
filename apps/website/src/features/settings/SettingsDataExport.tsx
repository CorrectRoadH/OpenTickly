import { AppButton, SelectDropdown, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useCallback, useMemo, useState } from "react";

import { DatePickerButton } from "../../shared/ui/DatePickerButton.tsx";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { useTimeEntriesQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  getWorkspaceExportsDataUuidZip,
  postWorkspaceExports,
} from "../../shared/api/public/track/index.ts";

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

async function buildAndDownloadPdf(
  entries: GithubComTogglTogglApiInternalModelsTimeEntry[],
  startDate: string,
  endDate: string,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const filtered = entries.filter((e) => (e.duration ?? 0) >= 0);
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text("Time Entries Export", 14, 20);
  doc.setFontSize(11);
  doc.text(`Date range: ${startDate} to ${endDate}`, 14, 28);
  doc.text(`Total entries: ${filtered.length}`, 14, 34);

  const head = [
    ["Description", "Project", "Client", "Start", "Stop", "Duration", "Billable", "Tags"],
  ];
  const body = filtered.map((e) => [
    e.description ?? "",
    e.project_name ?? "",
    e.client_name ?? "",
    e.start ?? "",
    e.stop ?? "",
    formatDuration(e.duration ?? 0),
    e.billable ? "Yes" : "No",
    (e.tags ?? []).join(", "),
  ]);

  autoTable(doc, {
    body,
    head,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [44, 44, 44] },
  });

  doc.save(`time-entries-${startDate}-to-${endDate}.pdf`);
}

const EXPORT_OBJECT_TYPES = [
  { key: "projects", label: "Projects" },
  { key: "projects_users", label: "Project members" },
  { key: "project_tasks", label: "Project tasks" },
  { key: "clients", label: "Clients" },
  { key: "tags", label: "Tags" },
  { key: "team", label: "Team" },
  { key: "teams", label: "Teams" },
  { key: "workspace_settings", label: "Workspace Settings" },
  { key: "alerts", label: "Alerts" },
  { key: "custom_reports", label: "Custom Reports" },
  { key: "scheduled_reports", label: "Scheduled Reports" },
  { key: "tracking_reminders", label: "Tracking Reminders" },
  { key: "invoices", label: "Invoices" },
] as const;

function WorkspaceDataExport(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(EXPORT_OBJECT_TYPES.map((t) => t.key)),
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleObject(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === EXPORT_OBJECT_TYPES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(EXPORT_OBJECT_TYPES.map((t) => t.key)));
    }
  }

  async function handleExport() {
    if (selected.size === 0 || !workspaceId) return;
    setExporting(true);
    setError(null);
    try {
      const result = await postWorkspaceExports({
        path: { workspace_id: workspaceId },
        body: Array.from(selected),
      });
      const token = result.data as string;
      if (!token) {
        setError("Export failed: no token received");
        return;
      }
      const archiveResult = await getWorkspaceExportsDataUuidZip({
        path: { workspace_id: workspaceId, uuid: token },
        parseAs: "blob",
      });
      const blob = archiveResult.data as unknown as Blob;
      if (!blob) {
        setError("Export failed: could not download archive");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `workspace-export-${workspaceId}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SurfaceCard>
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Data Export</h2>
          <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
            Export workspace data as a ZIP archive.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px] text-white">
            <input
              checked={selected.size === EXPORT_OBJECT_TYPES.length}
              className="accent-[var(--track-accent)]"
              data-testid="export-select-all"
              onChange={toggleAll}
              type="checkbox"
            />
            Select items for export:
          </label>
          {EXPORT_OBJECT_TYPES.map((type) => (
            <label className="flex items-center gap-2 pl-4 text-[12px] text-white" key={type.key}>
              <input
                checked={selected.has(type.key)}
                className="accent-[var(--track-accent)]"
                data-testid={`export-object-${type.key}`}
                onChange={() => toggleObject(type.key)}
                type="checkbox"
              />
              {type.label}
            </label>
          ))}
        </div>

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        <AppButton
          data-testid="export-workspace-button"
          disabled={exporting || selected.size === 0}
          onClick={handleExport}
          type="button"
        >
          {exporting ? "Exporting..." : "Export"}
        </AppButton>
      </div>
    </SurfaceCard>
  );
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

  const handleExport = useCallback(async () => {
    if (!entriesQuery.data || entriesQuery.data.length === 0) return;

    setExporting(true);
    try {
      if (format === "csv") {
        const csv = buildCsv(entriesQuery.data);
        downloadBlob(csv, `time-entries-${startDate}-to-${endDate}.csv`);
      } else {
        await buildAndDownloadPdf(entriesQuery.data, startDate, endDate);
      }
    } finally {
      setExporting(false);
    }
  }, [entriesQuery.data, format, startDate, endDate]);

  return (
    <div className="space-y-6">
      <WorkspaceDataExport />
      <SurfaceCard>
        <div className="space-y-6 p-6">
          <div>
            <h2 className="text-[14px] font-semibold text-white">Export time entries</h2>
            <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
              Download your workspace time entries for a selected date range.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1 block text-[12px] font-medium text-[var(--track-text-soft)]">
                Start date
              </span>
              <DatePickerButton
                className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-left text-[12px] text-white"
                onChange={setStartDate}
                testId="export-start-date"
                value={startDate}
              />
            </div>

            <div className="block">
              <span className="mb-1 block text-[12px] font-medium text-[var(--track-text-soft)]">
                End date
              </span>
              <DatePickerButton
                className="h-9 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-left text-[12px] text-white"
                onChange={setEndDate}
                testId="export-end-date"
                value={endDate}
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[var(--track-text-soft)]">
              Export format
            </span>
            <SelectDropdown
              className="sm:w-48"
              data-testid="export-format"
              onChange={(v) => setFormat(v as ExportFormat)}
              options={[
                { value: "csv", label: "CSV" },
                { value: "pdf", label: "PDF" },
              ]}
              value={format}
            />
          </label>

          <div className="flex items-center gap-4">
            <AppButton
              data-testid="export-button"
              disabled={exporting || entriesQuery.isPending || entryCount === 0}
              onClick={handleExport}
              type="button"
            >
              {exporting ? "Exporting..." : "Export"}
            </AppButton>
            <span className="text-[12px] text-[var(--track-text-muted)]">
              {entriesQuery.isPending
                ? "Loading entries..."
                : `${entryCount} entries in selected range`}
            </span>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
