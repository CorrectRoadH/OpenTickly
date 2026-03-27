import { ShellToast } from "@opentoggl/web-ui";
import { type ChangeEvent, type ReactElement, useEffect, useId, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCreateArchiveImportJobMutation,
  useCreateTimeEntriesImportJobMutation,
  useImportJobQuery,
} from "../../shared/query/import-jobs.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type ImportFlow = "archive" | "time_entries";

type ImportToast = {
  description: string;
  title: string;
  tone: "error" | "success";
};

export function WorkspaceImportPage(): ReactElement {
  const archiveInputId = useId();
  const csvInputId = useId();
  const session = useSession();
  const createArchiveImportJobMutation = useCreateArchiveImportJobMutation();
  const createTimeEntriesImportJobMutation = useCreateTimeEntriesImportJobMutation();
  const [organizationName, setOrganizationName] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<File | null>(null);
  const [selectedCSV, setSelectedCSV] = useState<File | null>(null);
  const [submittedJob, setSubmittedJob] = useState<{ id: string; source: ImportFlow } | null>(null);
  const [toast, setToast] = useState<ImportToast | null>(null);
  const importJobQuery = useImportJobQuery(submittedJob?.id ?? null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  function handleArchiveFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedArchive(event.target.files?.[0] ?? null);
  }

  async function handleArchiveUpload() {
    if (!selectedArchive || organizationName.trim().length === 0) return;
    try {
      const job = await createArchiveImportJobMutation.mutateAsync({
        archive: selectedArchive,
        organizationName,
      });
      setSubmittedJob({ id: job.job_id, source: "archive" });
      setSelectedArchive(null);
      setToast({
        description: `Organization "${organizationName}" created and archive imported.`,
        title: "Import completed",
        tone: "success",
      });
    } catch (error) {
      setSubmittedJob(null);
      setToast({
        description: resolveArchiveImportErrorMessage(error) ?? "An unexpected error occurred.",
        title: "Import failed",
        tone: "error",
      });
    }
  }

  function handleCSVFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedCSV(event.target.files?.[0] ?? null);
  }

  async function handleCSVUpload() {
    if (!selectedCSV) return;
    try {
      const job = await createTimeEntriesImportJobMutation.mutateAsync({
        archive: selectedCSV,
        workspaceId: session.currentWorkspace.id,
      });
      setSubmittedJob({ id: job.job_id, source: "time_entries" });
      setSelectedCSV(null);
      setToast({
        description: `Time entries imported into "${session.currentWorkspace.name}".`,
        title: "Import completed",
        tone: "success",
      });
    } catch (error) {
      setSubmittedJob(null);
      setToast({
        description: resolveTimeEntriesImportErrorMessage(error) ?? "An unexpected error occurred.",
        title: "Import failed",
        tone: "error",
      });
    }
  }

  const latestStatus = submittedJob ? (importJobQuery.data?.status ?? "queued") : null;

  return (
    <div className="w-full min-w-0 bg-[var(--track-surface)] px-5 py-5 text-white">
      <section className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <div className="border-b border-[var(--track-border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Manage
              </p>
              <h1 className="mt-2 text-[21px] font-semibold leading-[30px] text-white">Import</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--track-text-muted)]">
                Import is a two-step migration flow. Step 1 creates a new organization from a Toggl
                export zip. Step 2 imports time entries CSV into the workspace you are currently
                viewing.
              </p>
            </div>
            <div className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Current workspace
              </p>
              <p className="mt-2 text-[14px] font-medium text-white">
                {session.currentWorkspace.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* Step 1: Archive import */}
            <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]">
                  <TrackingIcon className="size-5" name="import" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                    Step 1
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold leading-[23px] text-white">
                    Create a new organization from Toggl export zip
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                    Upload the original `*.zip` file exported from Toggl. The backend creates a new
                    organization and its default workspace, then imports the extracted JSON bundle
                    into that new workspace.
                  </p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                  New organization name
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-white outline-none transition focus:border-[var(--track-accent-text)]"
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Imported Org"
                  type="text"
                  value={organizationName}
                />
              </label>

              <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[13px] leading-6 text-[var(--track-text-muted)]">
                The archive should contain a root folder like
                <span className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-white">
                  toggl_workspace_3550374_export_...
                </span>
                with JSON files inside.
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
                  htmlFor={archiveInputId}
                >
                  <TrackingIcon className="size-3.5" name="plus" />
                  Choose zip
                </label>
                <input
                  accept=".zip,application/zip"
                  className="sr-only"
                  id={archiveInputId}
                  onChange={handleArchiveFileChange}
                  type="file"
                />
                <span className="min-w-0 truncate text-[13px] text-[var(--track-text-muted)]">
                  {selectedArchive ? selectedArchive.name : "No file selected"}
                </span>
              </div>

              {selectedArchive ? (
                <div className="mt-4">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[var(--track-accent)] px-5 text-[12px] font-semibold text-black disabled:opacity-50"
                    disabled={
                      organizationName.trim().length === 0 ||
                      createArchiveImportJobMutation.isPending
                    }
                    onClick={() => void handleArchiveUpload()}
                    type="button"
                  >
                    {createArchiveImportJobMutation.isPending ? "Importing…" : "Upload & import"}
                  </button>
                  {organizationName.trim().length === 0 ? (
                    <p className="mt-2 text-[13px] text-[var(--track-text-muted)]">
                      Enter an organization name above to start import.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* Step 2: CSV import */}
            <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1f3d2b] text-[#8fe0ac]">
                  <TrackingIcon className="size-5" name="timer" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                    Step 2
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold leading-[23px] text-white">
                    Import time entries CSV into current workspace
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                    Upload a CSV exported from Toggl time entries. The backend imports rows into
                    <span className="mx-1 font-medium text-white">
                      {session.currentWorkspace.name}
                    </span>
                    and links them to matching clients, projects, tasks, and tags.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[13px] leading-6 text-[var(--track-text-muted)]">
                Expected columns include `User`, `Email`, `Project`, `Description`, `Start date`,
                `Start time`, `Duration`, and `Tags`.
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
                  htmlFor={csvInputId}
                >
                  <TrackingIcon className="size-3.5" name="plus" />
                  Choose CSV
                </label>
                <input
                  accept=".csv,text/csv"
                  className="sr-only"
                  id={csvInputId}
                  onChange={handleCSVFileChange}
                  type="file"
                />
                <span className="min-w-0 truncate text-[13px] text-[var(--track-text-muted)]">
                  {selectedCSV ? selectedCSV.name : "No file selected"}
                </span>
              </div>

              {selectedCSV ? (
                <div className="mt-4">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[var(--track-accent)] px-5 text-[12px] font-semibold text-black disabled:opacity-50"
                    disabled={createTimeEntriesImportJobMutation.isPending}
                    onClick={() => void handleCSVUpload()}
                    type="button"
                  >
                    {createTimeEntriesImportJobMutation.isPending
                      ? "Importing…"
                      : "Upload & import"}
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
            <h2 className="text-[16px] font-semibold leading-[23px] text-white">Latest job</h2>
            <div className="mt-4 space-y-4">
              <SummaryRow label="Job ID" value={submittedJob?.id ?? "Not started"} />
              <SummaryRow label="Status" value={latestStatus ?? "Waiting for upload"} />
              <SummaryRow
                label="Source"
                value={
                  submittedJob?.source === "archive"
                    ? "toggl_export_archive"
                    : submittedJob?.source === "time_entries"
                      ? "time_entries_csv"
                      : "Pending"
                }
              />
            </div>
            <p className="mt-5 text-[13px] leading-6 text-[var(--track-text-muted)]">
              Each upload creates a job record. Archive import creates a new organization workspace;
              CSV import targets the workspace shown at the top of this page.
            </p>
          </aside>
        </div>
      </section>
      {toast ? <ShellToast {...toast} /> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
        {label}
      </p>
      <p className="mt-2 break-all text-[13px] font-medium text-white">{value}</p>
    </div>
  );
}

function resolveArchiveImportErrorMessage(error: unknown): string | null {
  if (!(error instanceof WebApiError)) {
    return null;
  }
  if (error.status === 400) {
    return "Enter a new organization name and upload a valid Toggl export zip.";
  }
  return "Archive import upload failed. Retry with the original Toggl export zip.";
}

function resolveTimeEntriesImportErrorMessage(error: unknown): string | null {
  if (!(error instanceof WebApiError)) {
    return null;
  }
  if (error.status === 400) {
    return "The uploaded CSV is not a valid Toggl time entries export.";
  }
  if (error.status === 403) {
    return "You do not have permission to import time entries into this workspace.";
  }
  return "Time entries import failed. Retry with the original Toggl CSV export.";
}
