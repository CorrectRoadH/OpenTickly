import type { ReactElement } from "react";

import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";

const SHORTCUT_ROWS: ReadonlyArray<{ description: string; keys: string }> = [
  { description: "Show keyboard shortcuts", keys: "?" },
  { description: "Start new time entry", keys: "n" },
  { description: "Stop current timer", keys: "s" },
  { description: "Close dialog / editor", keys: "Esc" },
];

export function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <ModalDialog onClose={onClose} title="Keyboard shortcuts" width="max-w-[380px]">
      <div className="space-y-0">
        {SHORTCUT_ROWS.map((row) => (
          <div className="flex items-center justify-between py-2.5" key={row.keys}>
            <span className="text-[13px] text-white">{row.description}</span>
            <kbd className="flex h-6 min-w-[28px] items-center justify-center rounded-md border border-[var(--track-border)] bg-[var(--track-tooltip-surface)] px-2 text-[12px] font-medium text-[var(--track-text-muted)]">
              {row.keys}
            </kbd>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}
