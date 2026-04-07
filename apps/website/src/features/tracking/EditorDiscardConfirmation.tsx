import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useEditorContext } from "./TimeEntryEditorContext.tsx";

export function EditorDiscardConfirmation(): ReactElement | null {
  const { t } = useTranslation("tracking");
  const { dispatch, onClose, onDiscard, ui } = useEditorContext();

  if (!ui.showDiscardConfirmation) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center rounded-[14px] bg-[var(--track-overlay-backdrop)] px-6"
      data-testid="time-entry-editor-discard-confirmation"
    >
      <div className="w-full max-w-[280px] rounded-[14px] border border-[var(--track-control-border)] bg-[var(--track-overlay-surface-raised)] p-4 shadow-[0_16px_32px_var(--track-shadow-overlay-strong)]">
        <h3 className="text-[14px] font-semibold text-white">{t("discardChanges")}</h3>
        <p className="mt-2 text-[12px] text-[var(--track-overlay-text-subtle)]">
          {t("unsavedChangesMessage")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-[10px] border border-[var(--track-control-border)] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-white/4"
            onClick={() => dispatch({ type: "SET_DISCARD_CONFIRMATION", show: false })}
            type="button"
          >
            {t("keepEditing")}
          </button>
          <button
            className="rounded-[10px] bg-[var(--track-danger-fill)] px-3 py-2 text-[12px] font-semibold text-[var(--track-button-text)] transition hover:brightness-110"
            onClick={() => {
              dispatch({ type: "SET_DISCARD_CONFIRMATION", show: false });
              onDiscard?.();
              onClose();
            }}
            type="button"
          >
            {t("discard")}
          </button>
        </div>
      </div>
    </div>
  );
}
