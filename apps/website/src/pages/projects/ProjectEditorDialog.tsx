import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";
import { ColorSwatchPicker } from "../../shared/ui/ColorSwatchPicker.tsx";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import { ProjectEditorAdvanced } from "./ProjectEditorAdvanced.tsx";
type ProjectEditorDialogProps = {
  billable: boolean;
  clientId: number | null;
  clients: Array<{ id: number; name: string }>;
  color: string;
  endDate: string;
  error?: string | null;
  estimatedHours: number;
  fixedFee: number;
  isPending?: boolean;
  isPrivate: boolean;
  name: string;
  onBillableChange: (value: boolean) => void;
  onClientChange: (clientId: number | null) => void;
  onClose: () => void;
  onColorChange: (value: string) => void;
  onCreateClient: (name: string) => void;
  onEndDateChange: (value: string) => void;
  onEstimatedHoursChange: (value: number) => void;
  onFixedFeeChange: (value: number) => void;
  onNameChange: (value: string) => void;
  onPrivacyChange: (value: boolean) => void;
  onRecurringChange: (value: boolean) => void;
  onStartDateChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateChange: (value: boolean) => void;
  recurring: boolean;
  startDate: string;
  submitLabel: string;
  template: boolean;
  title: string;
};

export function ProjectEditorDialog({
  billable,
  clientId,
  clients,
  color,
  endDate,
  error,
  estimatedHours,
  fixedFee,
  isPending = false,
  isPrivate,
  name,
  onBillableChange,
  onClientChange,
  onClose,
  onColorChange,
  onCreateClient,
  onEndDateChange,
  onEstimatedHoursChange,
  onFixedFeeChange,
  onNameChange,
  onPrivacyChange,
  onRecurringChange,
  onStartDateChange,
  onSubmit,
  onTemplateChange,
  recurring,
  startDate,
  submitLabel,
  template,
  title,
}: ProjectEditorDialogProps): ReactElement {
  const { t } = useTranslation("projects");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const trimmedName = name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) return;
    onSubmit();
  }

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
                        onColorChange(option);
                        setColorPickerOpen(false);
                      }}
                      selected={color}
                    />
                  </div>
                ) : null}
              </div>
              <input
                aria-label={t("projectName")}
                className={`h-11 min-w-0 flex-1 rounded-md border bg-[var(--track-control-surface)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)] ${
                  error ? "border-rose-400" : "border-[var(--track-border)]"
                }`}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={t("projectName")}
                value={name}
              />
            </div>
            {error ? (
              <span className="mt-2 block text-[12px] text-rose-400">{error}</span>
            ) : !trimmedName ? (
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
                onClick={() => onPrivacyChange(!isPrivate)}
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
                  onBillableChange={onBillableChange}
                  onClientChange={onClientChange}
                  onCreateClient={onCreateClient}
                  onEndDateChange={onEndDateChange}
                  onEstimatedHoursChange={onEstimatedHoursChange}
                  onFixedFeeChange={onFixedFeeChange}
                  onRecurringChange={onRecurringChange}
                  onStartDateChange={onStartDateChange}
                  onTemplateChange={onTemplateChange}
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
