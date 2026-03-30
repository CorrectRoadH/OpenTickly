import { type FormEvent, type ReactElement } from "react";

import { ColorSwatchPicker } from "./ColorSwatchPicker.tsx";
import { ModalDialog } from "./ModalDialog.tsx";

type CreateNameDialogProps = {
  colorOptions?: readonly string[];
  isPending?: boolean;
  nameLabel: string;
  namePlaceholder: string;
  nameValue: string;
  onClose: () => void;
  onColorSelect?: (color: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  selectedColor?: string;
  submitLabel: string;
  testId?: string;
  title: string;
};

export function CreateNameDialog({
  colorOptions,
  isPending = false,
  nameLabel,
  namePlaceholder,
  nameValue,
  onClose,
  onColorSelect,
  onNameChange,
  onSubmit,
  selectedColor,
  submitLabel,
  testId,
  title,
}: CreateNameDialogProps): ReactElement {
  const trimmedValue = nameValue.trim();
  const showColorPicker =
    Boolean(colorOptions?.length) && Boolean(onColorSelect) && Boolean(selectedColor);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedValue || isPending) {
      return;
    }

    onSubmit();
  }

  return (
    <ModalDialog
      onClose={onClose}
      testId={testId}
      title={title}
      titleId="create-entity-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">{nameLabel}</span>
            <input
              aria-label={nameLabel}
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-surface-error)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={namePlaceholder}
              value={nameValue}
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
                  onSelect={(color) => onColorSelect?.(color)}
                  selected={selectedColor!}
                />
              </div>
            </div>
          ) : null}
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
            disabled={isPending || !trimmedValue}
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
