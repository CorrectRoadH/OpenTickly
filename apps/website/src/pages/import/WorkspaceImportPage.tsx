import { AppButton, PageLayout } from "@opentoggl/web-ui";
import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ImportIcon, PlusIcon, TimerIcon } from "../../shared/ui/icons.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useCreateArchiveImportJobMutation,
  useCreateTimeEntriesImportJobMutation,
} from "../../shared/query/import-jobs.ts";
import { useUpdateWebSessionMutation } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import type { SessionWorkspaceSummaryViewModel } from "../../entities/session/session-bootstrap.ts";

export function WorkspaceImportPage(): ReactElement {
  const { t } = useTranslation();
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const session = useSession();
  const createArchiveImportJobMutation = useCreateArchiveImportJobMutation();
  const createTimeEntriesImportJobMutation = useCreateTimeEntriesImportJobMutation();
  const updateWebSessionMutation = useUpdateWebSessionMutation();

  const [organizationName, setOrganizationName] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<File | null>(null);
  const [selectedCSVs, setSelectedCSVs] = useState<File[]>([]);

  // CSV import org/workspace target — defaults to current session org/workspace
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(
    session.currentOrganization?.id ?? null,
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    session.currentWorkspace.id,
  );
  const [pendingCsvTarget, setPendingCsvTarget] = useState<{
    organizationId: number;
    workspaceId: number;
  } | null>(null);

  const workspacesForOrg: SessionWorkspaceSummaryViewModel[] = session.availableWorkspaces.filter(
    (ws) => ws.organizationId === selectedOrgId,
  );

  // Switch Step 2 selector once session refreshes with the newly imported org.
  useEffect(() => {
    if (!pendingCsvTarget) return;
    const orgExists = session.availableOrganizations.some(
      (org) => org.id === pendingCsvTarget.organizationId,
    );
    if (!orgExists) return;
    setSelectedOrgId(pendingCsvTarget.organizationId);
    setSelectedWorkspaceId(pendingCsvTarget.workspaceId);
    setPendingCsvTarget(null);
  }, [pendingCsvTarget, session.availableOrganizations]);

  function handleOrgChange(orgId: number) {
    setSelectedOrgId(orgId);
    const firstWs = session.availableWorkspaces.find((ws) => ws.organizationId === orgId);
    setSelectedWorkspaceId(firstWs?.id ?? null);
  }

  async function handleArchiveUpload() {
    if (!selectedArchive || organizationName.trim().length === 0) return;
    try {
      const job = await createArchiveImportJobMutation.mutateAsync({
        archive: selectedArchive,
        organizationName,
      });
      if (job.status === "failed") {
        toast.error(
          job.error_message
            ? `Archive import failed: ${job.error_message}`
            : "Archive import failed.",
          { duration: 6000 },
        );
        return;
      }
      setSelectedArchive(null);
      if (job.organization_id) {
        const target = { organizationId: job.organization_id, workspaceId: job.workspace_id };
        setPendingCsvTarget(target);
        void updateWebSessionMutation
          .mutateAsync({ workspace_id: job.workspace_id })
          .catch(() => undefined);
      }
      toast.success(t("toast:organizationCreated", { name: organizationName }));
    } catch (error) {
      toast.error(resolveArchiveImportErrorMessage(error) ?? t("toast:unexpectedError"), {
        duration: 4000,
      });
    }
  }

  async function handleCSVUpload() {
    if (selectedCSVs.length === 0 || !selectedWorkspaceId) return;
    try {
      for (const file of selectedCSVs) {
        const job = await createTimeEntriesImportJobMutation.mutateAsync({
          archive: file,
          workspaceId: selectedWorkspaceId,
        });
        if (job.status === "failed") {
          toast.error(
            job.error_message
              ? `Import failed: ${job.error_message}`
              : "Time entries import failed.",
            { duration: 6000 },
          );
          return;
        }
      }
      setSelectedCSVs([]);
      toast.success(t("toast:timeEntriesImported"));
    } catch (error) {
      toast.error(resolveTimeEntriesImportErrorMessage(error) ?? t("toast:unexpectedError"), {
        duration: 4000,
      });
    }
  }

  const selectedWorkspaceName =
    session.availableWorkspaces.find((ws) => ws.id === selectedWorkspaceId)?.name ?? "";

  return (
    <PageLayout title="Import">
      <div className="mx-auto max-w-2xl space-y-5 p-5">
        {/* Step 1: Archive import */}
        <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]">
              <ImportIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Step 1
              </p>
              <h2 className="mt-2 text-[14px] font-semibold leading-[23px] text-white">
                Create a new organization from Toggl export zip
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                Upload the original `*.zip` file exported from Toggl. The backend creates a new
                organization and its default workspace, then imports the extracted JSON bundle into
                that new workspace.
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

          <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[12px] leading-6 text-[var(--track-text-muted)]">
            The archive should contain a root folder like
            <span className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-white">
              toggl_workspace_3550374_export_...
            </span>
            with JSON files inside.
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AppButton
              disabled={createArchiveImportJobMutation.isPending}
              onClick={() => archiveInputRef.current?.click()}
            >
              <PlusIcon className="size-3.5" />
              Choose zip
            </AppButton>
            <input
              ref={archiveInputRef}
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSelectedArchive(e.target.files?.[0] ?? null)
              }
              type="file"
            />
            <span className="min-w-0 truncate text-[12px] text-[var(--track-text-muted)]">
              {selectedArchive ? selectedArchive.name : "No file selected"}
            </span>
          </div>

          {selectedArchive ? (
            <div className="mt-4">
              <AppButton
                disabled={
                  organizationName.trim().length === 0 || createArchiveImportJobMutation.isPending
                }
                onClick={() => void handleArchiveUpload()}
              >
                {createArchiveImportJobMutation.isPending ? "Importing…" : "Upload & import"}
              </AppButton>
              {organizationName.trim().length === 0 ? (
                <p className="mt-2 text-[12px] text-[var(--track-text-muted)]">
                  Enter an organization name above to start import.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Step 2: CSV import */}
        <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-success-surface-strong)] text-[var(--track-success-text-strong)]">
              <TimerIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Step 2
              </p>
              <h2 className="mt-2 text-[14px] font-semibold leading-[23px] text-white">
                Import time entries CSV into current workspace
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                Upload a CSV exported from Toggl time entries. The backend imports rows into
                <span className="mx-1 font-medium text-white">{selectedWorkspaceName}</span>
                and links them to matching clients, projects, tasks, and tags.
              </p>
            </div>
          </div>

          {/* Org + workspace selector */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Organization
              </span>
              <select
                className="mt-2 h-11 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-white outline-none transition focus:border-[var(--track-accent-text)]"
                onChange={(e) => handleOrgChange(Number(e.target.value))}
                value={selectedOrgId ?? ""}
              >
                {session.availableOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                Workspace
              </span>
              <select
                className="mt-2 h-11 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-white outline-none transition focus:border-[var(--track-accent-text)] disabled:opacity-50"
                disabled={workspacesForOrg.length === 0}
                onChange={(e) => setSelectedWorkspaceId(Number(e.target.value))}
                value={selectedWorkspaceId ?? ""}
              >
                {workspacesForOrg.length === 0 ? (
                  <option value="">No workspaces</option>
                ) : (
                  workspacesForOrg.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[12px] leading-6 text-[var(--track-text-muted)]">
            Expected columns include `User`, `Email`, `Project`, `Description`, `Start date`, `Start
            time`, `Duration`, and `Tags`.
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AppButton
              disabled={!selectedWorkspaceId || createTimeEntriesImportJobMutation.isPending}
              onClick={() => csvInputRef.current?.click()}
            >
              <PlusIcon className="size-3.5" />
              Choose CSV
            </AppButton>
            <input
              ref={csvInputRef}
              accept=".csv,text/csv"
              className="sr-only"
              multiple
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const files = e.target.files;
                if (files && files.length > 0) setSelectedCSVs(Array.from(files));
              }}
              type="file"
            />
            <span className="min-w-0 truncate text-[12px] text-[var(--track-text-muted)]">
              {selectedCSVs.length > 1
                ? `${String(selectedCSVs.length)} files selected`
                : selectedCSVs.length === 1
                  ? selectedCSVs[0].name
                  : "No file selected"}
            </span>
          </div>

          {selectedCSVs.length > 0 ? (
            <div className="mt-4">
              <AppButton
                disabled={createTimeEntriesImportJobMutation.isPending || !selectedWorkspaceId}
                onClick={() => void handleCSVUpload()}
              >
                {createTimeEntriesImportJobMutation.isPending ? "Importing…" : "Upload & import"}
              </AppButton>
            </div>
          ) : null}
        </section>
      </div>
    </PageLayout>
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
