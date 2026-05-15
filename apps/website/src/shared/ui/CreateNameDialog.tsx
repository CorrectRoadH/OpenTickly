import { type FormEvent, type ReactElement, useState } from "react";
import { AppButton, AppInput } from "@opentickly/web-ui";

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
          <AppButton onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </AppButton>
          <AppButton
            disabled={isPending || !trimmedName}
            form="create-name-form"
            size="sm"
            type="submit"
          >
            {submitLabel}
          </AppButton>
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
            <AppInput
              aria-label={nameLabel}
              className="h-11 rounded-[8px]"
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
              <div className="rounded-[10px] border-2 border-[var(--track-border)] bg-[var(--track-surface)] p-3 shadow-[var(--track-depth-shadow-rest)]">
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
