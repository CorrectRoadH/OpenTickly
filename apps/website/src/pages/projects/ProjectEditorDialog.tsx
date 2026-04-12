import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import {
  useClientsQuery,
  useCreateClientMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import { TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";
import { ColorSwatchPicker } from "../../shared/ui/ColorSwatchPicker.tsx";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import { ProjectEditorAdvanced } from "./ProjectEditorAdvanced.tsx";
import { useProjectForm, type ProjectFormAction } from "./useProjectForm.ts";

export type ProjectEditorMode = "create" | "edit";

type ProjectEditorDialogProps = {
  mode: ProjectEditorMode;
  project?: GithubComTogglTogglApiInternalModelsProject | null;
  onClose: () => void;
  onSuccess?: (mode: ProjectEditorMode) => void;
};

export function ProjectEditorDialog({
  mode,
  project,
  onClose,
  onSuccess,
}: ProjectEditorDialogProps): ReactElement {
  const { t } = useTranslation("projects");
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;

  const [form, formDispatch] = useProjectForm(
    mode === "edit" && project ? { type: "OPEN_EDIT", project } : { type: "OPEN_CREATE" },
  );
  const {
    name,
    color,
    isPrivate,
    template,
    clientId,
    billable,
    startDate,
    endDate,
    recurring,
    estimatedHours,
    fixedFee,
    editorProject,
  } = form;

  const clientsQuery = useClientsQuery(workspaceId);
  const clients = (clientsQuery.data ?? [])
    .filter((c): c is { id: number; name: string } => c.id != null && c.name != null)
    .map((c) => ({ id: c.id, name: c.name }));

  const createClientMutation = useCreateClientMutation(workspaceId);
  const createProjectMutation = useCreateProjectMutation(workspaceId);
  const updateProjectMutation = useUpdateProjectMutation(workspaceId);
  const isPending =
    createProjectMutation.isPending ||
    updateProjectMutation.isPending ||
    createClientMutation.isPending;

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const trimmedName = name.trim();

  function dispatch(action: ProjectFormAction) {
    formDispatch(action);
  }

  async function handleCreateClient(clientName: string) {
    const client = await createClientMutation.mutateAsync(clientName);
    if (client?.id) {
      dispatch({ type: "SET_CLIENT_ID", value: client.id });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) return;

    const sharedFields = {
      billable,
      clientId: clientId ?? undefined,
      color,
      endDate: endDate || undefined,
      estimatedHours: estimatedHours || undefined,
      fixedFee: fixedFee || undefined,
      isPrivate,
      name: trimmedName,
      recurring,
      startDate: startDate || undefined,
      template,
    };

    try {
      if (mode === "edit" && editorProject?.id != null) {
        await updateProjectMutation.mutateAsync({
          ...sharedFields,
          projectId: editorProject.id,
        });
      } else {
        await createProjectMutation.mutateAsync(sharedFields);
      }
      onSuccess?.(mode);
      onClose();
    } catch (err) {
      toast.error(err instanceof WebApiError ? err.userMessage : t("projectNameAlreadyExists"));
    }
  }

  const submitLabel = mode === "edit" ? t("save") : t("createProject");
  const title = mode === "edit" ? t("editProject") : t("createNewProject");

  return (
    <ModalDialog
      footer={
        <>
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={isPending || !trimmedName}
            form="project-editor-form"
            type="submit"
          >
            {submitLabel}
          </button>
        </>
      }
      onClose={onClose}
      testId="project-editor-dialog"
      title={title}
      titleId="project-editor-title"
      width="max-w-[620px]"
    >
      <form id="project-editor-form" onSubmit={handleSubmit}>
        <div className="mt-1 space-y-3">
          {/* Project name + color picker */}
          <div>
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              {t("projectName")}
            </span>
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <button
                  aria-label={t("projectColor")}
                  className="flex size-11 items-center justify-center rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)]"
                  onClick={() => setColorPickerOpen((c) => !c)}
                  type="button"
                >
                  <span
                    className="size-6 rounded-full border border-black/20"
                    style={{ backgroundColor: color }}
                  />
                </button>
                {colorPickerOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-10 w-[220px] rounded-[10px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] p-3 shadow-[0_12px_28px_var(--track-shadow-overlay)]">
                    <ColorSwatchPicker
                      colors={TRACK_COLOR_SWATCHES}
                      onSelect={(option) => {
                        dispatch({ type: "SET_COLOR", value: option });
                        setColorPickerOpen(false);
                      }}
                      selected={color}
                    />
                  </div>
                ) : null}
              </div>
              <input
                aria-label={t("projectName")}
                className="h-11 min-w-0 flex-1 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
                onChange={(event) => dispatch({ type: "SET_NAME", value: event.target.value })}
                placeholder={t("projectName")}
                value={name}
              />
            </div>
            {!trimmedName ? (
              <span className="mt-2 block text-[12px] text-[var(--track-danger-text-strong)]">
                {t("projectName")}
              </span>
            ) : null}
          </div>

          {/* Privacy toggle */}
          <section className="rounded-lg border border-[var(--track-border)] bg-[var(--track-input-bg)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  {t("privacy")}
                </p>
                <p className="mt-1 text-[14px] text-white">
                  {isPrivate ? t("privacyPrivate") : t("privacyPublic")}
                </p>
              </div>
              <button
                aria-label={isPrivate ? t("privacyPrivate") : t("privacyPublic")}
                aria-pressed={isPrivate}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  isPrivate
                    ? "bg-[var(--track-accent-soft)]"
                    : "bg-[var(--track-control-disabled-strong)]"
                }`}
                onClick={() => dispatch({ type: "SET_PRIVATE", value: !isPrivate })}
                type="button"
              >
                <span
                  className={`inline-block size-5 rounded-full bg-white transition ${
                    isPrivate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Advanced options */}
          <section className="rounded-lg border border-[var(--track-border)] bg-[var(--track-input-bg)]">
            <button
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => setAdvancedOpen((c) => !c)}
              type="button"
            >
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                {t("advancedOptions")}
              </span>
              <span className="text-[18px] text-white">{advancedOpen ? "\u2212" : "+"}</span>
            </button>
            {advancedOpen ? (
              <div className="border-t border-[var(--track-border)] px-3 pb-3 pt-3">
                <ProjectEditorAdvanced
                  billable={billable}
                  clientId={clientId}
                  clients={clients}
                  endDate={endDate}
                  estimatedHours={estimatedHours}
                  fixedFee={fixedFee}
                  onBillableChange={(v) => dispatch({ type: "SET_BILLABLE", value: v })}
                  onClientChange={(v) => dispatch({ type: "SET_CLIENT_ID", value: v })}
                  onCreateClient={handleCreateClient}
                  onEndDateChange={(v) => dispatch({ type: "SET_END_DATE", value: v })}
                  onEstimatedHoursChange={(v) =>
                    dispatch({ type: "SET_ESTIMATED_HOURS", value: v })
                  }
                  onFixedFeeChange={(v) => dispatch({ type: "SET_FIXED_FEE", value: v })}
                  onRecurringChange={(v) => dispatch({ type: "SET_RECURRING", value: v })}
                  onStartDateChange={(v) => dispatch({ type: "SET_START_DATE", value: v })}
                  onTemplateChange={(v) => dispatch({ type: "SET_TEMPLATE", value: v })}
                  recurring={recurring}
                  startDate={startDate}
                  template={template}
                />
              </div>
            ) : null}
          </section>
        </div>
      </form>
    </ModalDialog>
  );
}
