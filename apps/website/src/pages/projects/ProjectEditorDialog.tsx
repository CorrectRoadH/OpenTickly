import { type FormEvent, type ReactElement, useEffect, useState } from "react";

import { TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";
import { ProjectEditorAdvanced } from "./ProjectEditorAdvanced.tsx";
import { ProjectEditorMembers } from "./ProjectEditorMembers.tsx";

export type ProjectEditorMember = {
  email?: string;
  id: number;
  name: string;
};

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
  memberRole: "manager" | "regular";
  members: ProjectEditorMember[];
  name: string;
  onBillableChange: (value: boolean) => void;
  onClientChange: (clientId: number | null) => void;
  onClose: () => void;
  onColorChange: (value: string) => void;
  onCreateClient: (name: string) => void;
  onEndDateChange: (value: string) => void;
  onEstimatedHoursChange: (value: number) => void;
  onFixedFeeChange: (value: number) => void;
  onMemberRoleChange: (value: "manager" | "regular") => void;
  onNameChange: (value: string) => void;
  onPrivacyChange: (value: boolean) => void;
  onRecurringChange: (value: boolean) => void;
  onStartDateChange: (value: string) => void;
  onSubmit: () => void;
  onTemplateChange: (value: boolean) => void;
  onToggleMember: (memberId: number) => void;
  recurring: boolean;
  selectedMemberIds: number[];
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
  memberRole,
  members,
  name,
  onBillableChange,
  onClientChange,
  onClose,
  onColorChange,
  onCreateClient,
  onEndDateChange,
  onEstimatedHoursChange,
  onFixedFeeChange,
  onMemberRoleChange,
  onNameChange,
  onPrivacyChange,
  onRecurringChange,
  onStartDateChange,
  onSubmit,
  onTemplateChange,
  onToggleMember,
  recurring,
  selectedMemberIds,
  startDate,
  submitLabel,
  template,
  title,
}: ProjectEditorDialogProps): ReactElement {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const trimmedName = name.trim();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) return;
    onSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/55 px-4 py-10"
      data-testid="project-editor-dialog-overlay"
      onClick={onClose}
    >
      <form
        aria-labelledby="project-editor-title"
        aria-modal="true"
        className="max-h-[calc(100vh-80px)] w-full max-w-[620px] overflow-y-auto rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-5 pb-5 pt-4 shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
        data-testid="project-editor-dialog"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-medium text-white" id="project-editor-title">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="text-[20px] leading-none text-[var(--track-text-muted)] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Project name + color picker */}
          <div>
            <span className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Project name
            </span>
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <button
                  aria-label="Select project color"
                  className="flex size-11 items-center justify-center rounded-md border border-[var(--track-border)] bg-[#262628]"
                  onClick={() => setColorPickerOpen((c) => !c)}
                  type="button"
                >
                  <span
                    className="size-6 rounded-full border border-black/20"
                    style={{ backgroundColor: color }}
                  />
                </button>
                {colorPickerOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-10 grid w-[220px] grid-cols-5 gap-2 rounded-[10px] border border-[#3f3f44] bg-[#1f1f20] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
                    {TRACK_COLOR_SWATCHES.map((option) => (
                      <button
                        aria-label={`Select color ${option}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                          color === option
                            ? "border-white/80 bg-white/8"
                            : "border-transparent hover:border-white/25"
                        }`}
                        key={option}
                        onClick={() => {
                          onColorChange(option);
                          setColorPickerOpen(false);
                        }}
                        type="button"
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-black/20"
                          style={{ backgroundColor: option }}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input
                aria-label="Project name"
                className={`h-11 min-w-0 flex-1 rounded-md border bg-[#262628] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)] ${
                  error ? "border-rose-400" : "border-[var(--track-border)]"
                }`}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Project name"
                value={name}
              />
            </div>
            {error ? (
              <span className="mt-2 block text-[12px] text-rose-400">{error}</span>
            ) : !trimmedName ? (
              <span className="mt-2 block text-[12px] text-[#ff9f8f]">
                Please enter a Project name
              </span>
            ) : null}
          </div>

          {/* Privacy toggle */}
          <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  Privacy
                </p>
                <p className="mt-2 text-[14px] text-white">
                  Private, visible only to project members
                </p>
              </div>
              <button
                aria-label="Private, visible only to project members"
                aria-pressed={isPrivate}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  isPrivate ? "bg-[var(--track-accent-soft)]" : "bg-[#3a3a3d]"
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

          {/* Members */}
          <ProjectEditorMembers
            memberRole={memberRole}
            members={members}
            onMemberRoleChange={onMemberRoleChange}
            onToggleMember={onToggleMember}
            selectedMemberIds={selectedMemberIds}
          />

          {/* Advanced options */}
          <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818]">
            <button
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setAdvancedOpen((c) => !c)}
              type="button"
            >
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Advanced options
              </span>
              <span className="text-[18px] text-white">{advancedOpen ? "\u2212" : "+"}</span>
            </button>
            {advancedOpen ? (
              <div className="border-t border-[var(--track-border)] px-4 pb-4 pt-4">
                <ProjectEditorAdvanced
                  billable={billable}
                  clientId={clientId}
                  clients={clients}
                  color={color}
                  endDate={endDate}
                  estimatedHours={estimatedHours}
                  fixedFee={fixedFee}
                  onBillableChange={onBillableChange}
                  onClientChange={onClientChange}
                  onColorChange={onColorChange}
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

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={isPending || !trimmedName}
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
