import { type FormEvent, type ReactElement, useEffect } from "react";

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
  title,
}: CreateNameDialogProps): ReactElement {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/55 px-4 py-10"
      onClick={onClose}
    >
      <form
        aria-labelledby="create-entity-dialog-title"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-4 pb-4 pt-3 shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-medium text-white" id="create-entity-dialog-title">
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

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="sr-only">{nameLabel}</span>
            <input
              aria-label={nameLabel}
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[#2b1717] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={namePlaceholder}
              value={nameValue}
            />
          </label>

          {showColorPicker ? (
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Color
              </p>
              <div className="grid grid-cols-5 gap-2 rounded-xl border border-[var(--track-border)] bg-[#181818] p-3">
                {colorOptions?.map((color) => (
                  <button
                    aria-label={`Select color ${color}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      selectedColor === color
                        ? "border-white/80 bg-white/8"
                        : "border-transparent hover:border-white/25"
                    }`}
                    key={color}
                    onClick={() => onColorSelect?.(color)}
                    type="button"
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-black/20"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                ))}
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
    </div>
  );
}
