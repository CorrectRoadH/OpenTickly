import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";

const SHORTCUT_ROWS: ReadonlyArray<{ descriptionKey: string; keys: string }> = [
  { descriptionKey: "showKeyboardShortcuts", keys: "?" },
  { descriptionKey: "startNewTimeEntry", keys: "n" },
  { descriptionKey: "stopCurrentTimer", keys: "s" },
  { descriptionKey: "closeDialogOrEditor", keys: "Esc" },
];

export function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }): ReactElement {
  const { t } = useTranslation("tracking");
  return (
    <ModalDialog onClose={onClose} title={t("keyboardShortcuts")} width="max-w-[380px]">
      <div className="space-y-0">
        {SHORTCUT_ROWS.map((row) => (
          <div className="flex items-center justify-between py-2.5" key={row.keys}>
            <span className="text-[12px] text-white">{t(row.descriptionKey)}</span>
            <kbd className="flex h-6 min-w-[28px] items-center justify-center rounded-md border border-[var(--track-border)] bg-[var(--track-tooltip-surface)] px-2 text-[12px] font-medium text-[var(--track-text-muted)]">
              {row.keys}
            </kbd>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}
