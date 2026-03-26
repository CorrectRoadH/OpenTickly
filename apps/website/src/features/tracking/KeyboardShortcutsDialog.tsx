import { type ReactElement, useEffect, useRef } from "react";

const SHORTCUT_ROWS: ReadonlyArray<{ description: string; keys: string }> = [
  { description: "Show keyboard shortcuts", keys: "?" },
  { description: "Start new time entry", keys: "n" },
  { description: "Stop current timer", keys: "s" },
  { description: "Close dialog / editor", keys: "Esc" },
];

export function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div
        className="w-[380px] rounded-xl border border-[var(--track-border)] bg-[#1f1f20] shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
        ref={panelRef}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-white">Keyboard shortcuts</h2>
          <button
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <span className="text-[16px] leading-none">&times;</span>
          </button>
        </div>
        <div className="px-5 py-4">
          {SHORTCUT_ROWS.map((row) => (
            <div className="flex items-center justify-between py-2.5" key={row.keys}>
              <span className="text-[13px] text-white">{row.description}</span>
              <kbd className="flex h-6 min-w-[28px] items-center justify-center rounded-md border border-[var(--track-border)] bg-[#2a2a2b] px-2 text-[12px] font-medium text-[var(--track-text-muted)]">
                {row.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
