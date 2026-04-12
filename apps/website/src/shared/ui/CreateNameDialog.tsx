import { type FormEvent, type ReactElement, useState } from "react";

import { ColorSwatchPicker } from "./ColorSwatchPicker.tsx";
import { ModalDialog } from "./ModalDialog.tsx";

export type CreateNameValues = {
  name: string;
  color?: string;
};

type CreateNameDialogProps = {
  colorOptions?: readonly string[];
  defaultColor?: string;
  isPending?: boolean;
  nameLabel: string;
  namePlaceholder: string;
  onClose: () => void;
  onSubmit: (values: CreateNameValues) => void;
  submitLabel: string;
  testId?: string;
  title: string;
};

export function CreateNameDialog({
  colorOptions,
  defaultColor,
  isPending = false,
  nameLabel,
  namePlaceholder,
  onClose,
  onSubmit,
  submitLabel,
  testId,
  title,
}: CreateNameDialogProps): ReactElement {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | undefined>(defaultColor);
  const trimmedName = name.trim();
  const showColorPicker = Boolean(colorOptions?.length) && Boolean(color);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) {
      return;
    }
    onSubmit({ name: trimmedName, color });
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
            Cancel
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={isPending || !trimmedName}
            form="create-name-form"
            type="submit"
          >
            {submitLabel}
          </button>
        </>
      }
      onClose={onClose}
      testId={testId}
      title={title}
      titleId="create-entity-dialog-title"
    >
      <form id="create-name-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">{nameLabel}</span>
            <input
              aria-label={nameLabel}
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-surface-error)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => setName(event.target.value)}
              placeholder={namePlaceholder}
              value={name}
            />
          </label>

          {showColorPicker ? (
            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Color
              </p>
              <div className="rounded-xl border border-[var(--track-border)] bg-[var(--track-input-bg)] p-3">
                <ColorSwatchPicker
                  colors={colorOptions!}
                  onSelect={(next) => setColor(next)}
                  selected={color!}
                />
              </div>
            </div>
          ) : null}
        </div>
      </form>
    </ModalDialog>
  );
}
