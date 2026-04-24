import { AppButton, PageLayout, SelectDropdown } from "@opentickly/web-ui";
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
  const { t } = useTranslation("import");
  const toastT = useTranslation();
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
            ? t("archiveImportFailedWithMessage", { message: job.error_message })
            : t("archiveImportFailed"),
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
      toast.success(toastT.t("toast:organizationCreated", { name: organizationName }));
    } catch (error) {
      toast.error(resolveImportErrorMessage(error) ?? toastT.t("toast:unexpectedError"), {
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
              ? t("csvImportFailedWithMessage", { message: job.error_message })
              : t("csvImportFailed"),
            { duration: 6000 },
          );
          return;
        }
      }
      setSelectedCSVs([]);
      toast.success(toastT.t("toast:timeEntriesImported"));
    } catch (error) {
      toast.error(resolveImportErrorMessage(error) ?? toastT.t("toast:unexpectedError"), {
        duration: 4000,
      });
    }
  }

  const selectedWorkspaceName =
    session.availableWorkspaces.find((ws) => ws.id === selectedWorkspaceId)?.name ?? "";

  return (
    <PageLayout title={t("import")}>
      <div className="mx-auto max-w-2xl space-y-5 p-5">
        <a
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--track-accent-text)] hover:underline"
          href="https://track.toggl.com/settings"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("openTogglSettings")} ↗
        </a>

        {/* Step 1: Archive import */}
        <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]">
              <ImportIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                {t("step1")}
              </p>
              <h2 className="mt-2 text-[14px] font-semibold leading-[23px] text-white">
                {t("createOrgFromZip")}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                {t("zipUploadDescription")}
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
              {t("newOrgName")}
            </span>
            <input
              className="mt-2 h-11 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-white outline-none transition focus:border-[var(--track-accent-text)]"
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder={t("importedOrg")}
              type="text"
              value={organizationName}
            />
          </label>

          <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[12px] leading-6 text-[var(--track-text-muted)]">
            {t("zipHint")}
            <span className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-white">
              {t("zipHintExample")}
            </span>
            {t("zipHintEnd")}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AppButton
              disabled={createArchiveImportJobMutation.isPending}
              onClick={() => archiveInputRef.current?.click()}
            >
              <PlusIcon className="size-3.5" />
              {t("chooseZip")}
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
              {selectedArchive ? selectedArchive.name : t("noFileSelected")}
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
                {createArchiveImportJobMutation.isPending ? t("importing") : t("uploadImport")}
              </AppButton>
              {organizationName.trim().length === 0 ? (
                <p className="mt-2 text-[12px] text-[var(--track-text-muted)]">
                  {t("enterOrgNameHint")}
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
                {t("step2")}
              </p>
              <h2 className="mt-2 text-[14px] font-semibold leading-[23px] text-white">
                {t("importTimeEntriesCsv")}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
                {t("csvUploadDescription")}{" "}
                <span className="mx-1 font-medium text-white">{selectedWorkspaceName}</span>.
              </p>
            </div>
          </div>

          {/* Org + workspace selector */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                {t("organization")}
              </span>
              <div className="mt-2">
                <SelectDropdown
                  aria-label={t("organization")}
                  className="h-11 w-full text-[14px]"
                  onChange={(v) => handleOrgChange(Number(v))}
                  options={session.availableOrganizations.map((org) => ({
                    label: org.name,
                    value: String(org.id),
                  }))}
                  value={selectedOrgId ?? ""}
                />
              </div>
            </div>

            <div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
                {t("workspace")}
              </span>
              <div className="mt-2">
                <SelectDropdown
                  aria-label={t("workspace")}
                  className="h-11 w-full text-[14px]"
                  disabled={workspacesForOrg.length === 0}
                  onChange={(v) => setSelectedWorkspaceId(Number(v))}
                  options={
                    workspacesForOrg.length === 0
                      ? [{ label: t("noWorkspaces"), value: "" }]
                      : workspacesForOrg.map((ws) => ({
                          label: ws.name,
                          value: String(ws.id),
                        }))
                  }
                  value={selectedWorkspaceId ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[12px] leading-6 text-[var(--track-text-muted)]">
            {t("csvHint")}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AppButton
              disabled={!selectedWorkspaceId || createTimeEntriesImportJobMutation.isPending}
              onClick={() => csvInputRef.current?.click()}
            >
              <PlusIcon className="size-3.5" />
              {t("chooseCsv")}
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
                ? `${String(selectedCSVs.length)} ${t("filesSelected")}`
                : selectedCSVs.length === 1
                  ? selectedCSVs[0].name
                  : t("noFileSelected")}
            </span>
          </div>

          {selectedCSVs.length > 0 ? (
            <div className="mt-4">
              <AppButton
                disabled={createTimeEntriesImportJobMutation.isPending || !selectedWorkspaceId}
                onClick={() => void handleCSVUpload()}
              >
                {createTimeEntriesImportJobMutation.isPending ? t("importing") : t("uploadImport")}
              </AppButton>
            </div>
          ) : null}
        </section>
      </div>
    </PageLayout>
  );
}

function resolveImportErrorMessage(error: unknown): string | null {
  if (error instanceof WebApiError) {
    return error.userMessage;
  }
  return null;
}
