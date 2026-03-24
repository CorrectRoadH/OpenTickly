import { type ChangeEvent, type ReactElement, useId, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCreateImportJobMutation,
  useImportJobQuery,
} from "../../shared/query/import-jobs.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceImportPage(): ReactElement {
  const fileInputId = useId();
  const session = useSession();
  const createImportJobMutation = useCreateImportJobMutation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const importJobQuery = useImportJobQuery(submittedJobId);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    if (!nextFile) {
      return;
    }

    try {
      const job = await createImportJobMutation.mutateAsync({
        archive: nextFile,
        workspaceId: session.currentWorkspace.id,
      });
      setSubmittedJobId(job.job_id);
    } catch {
      setSubmittedJobId(null);
    }
  }

  const errorMessage = resolveImportErrorMessage(createImportJobMutation.error);
  const latestStatus = submittedJobId ? (importJobQuery.data?.status ?? "queued") : null;

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
                Upload a Toggl workspace export zip. The backend accepts the archive directly and
                processes the extracted JSON bundle asynchronously.
              </p>
            </div>
            <div className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Workspace
              </p>
              <p className="mt-2 text-[14px] font-medium text-white">{session.currentWorkspace.name}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]">
                <TrackingIcon className="size-5" name="import" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold leading-[23px] text-white">
                  Toggl export archive
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                  Select the original `*.zip` file exported from Toggl. The archive should contain
                  a root folder like
                  <span className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-white">
                    toggl_workspace_3550374_export_...
                  </span>
                  with JSON files inside.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
                htmlFor={fileInputId}
              >
                <TrackingIcon className="size-3.5" name="plus" />
                Choose zip
              </label>
              <input
                accept=".zip,application/zip"
                className="sr-only"
                id={fileInputId}
                onChange={(event) => {
                  void handleFileSelection(event);
                }}
                type="file"
              />
              <span className="min-w-0 truncate text-[13px] text-[var(--track-text-muted)]">
                {selectedFile ? selectedFile.name : "No file selected"}
              </span>
            </div>

            {createImportJobMutation.isPending ? (
              <p className="mt-4 text-[13px] text-[var(--track-accent-text)]">Uploading archive…</p>
            ) : null}
            {errorMessage ? (
              <p className="mt-4 text-[13px] text-[#ff8f8f]">{errorMessage}</p>
            ) : null}
          </section>

          <aside className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
            <h2 className="text-[16px] font-semibold leading-[23px] text-white">Latest job</h2>
            <div className="mt-4 space-y-4">
              <SummaryRow label="Job ID" value={submittedJobId ?? "Not started"} />
              <SummaryRow label="Status" value={latestStatus ?? "Waiting for upload"} />
              <SummaryRow
                label="Source"
                value={submittedJobId ? "toggl_export_archive" : "Pending"}
              />
            </div>
            <p className="mt-5 text-[13px] leading-6 text-[var(--track-text-muted)]">
              This slice uploads the zip to the backend and records the import job. Detailed
              conflict diagnostics and retry flows can now hang off the same job ID.
            </p>
          </aside>
        </div>
      </section>
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

function resolveImportErrorMessage(error: unknown): string | null {
  if (!(error instanceof WebApiError)) {
    return null;
  }
  if (error.status === 400) {
    return "The uploaded zip is not a valid Toggl export archive.";
  }
  if (error.status === 403) {
    return "You do not have permission to import into this workspace.";
  }
  return "Import upload failed. Retry with the original Toggl export zip.";
}
