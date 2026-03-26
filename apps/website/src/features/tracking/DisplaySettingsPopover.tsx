import { type ReactElement, useEffect, useRef } from "react";

import { TrackingIcon } from "./tracking-icons.tsx";

export function DisplaySettingsPopover({
  onClose,
  showAllEntries,
  onToggleShowAllEntries,
}: {
  onClose: () => void;
  onToggleShowAllEntries: () => void;
  showAllEntries: boolean;
}): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-[var(--track-border)] bg-[#1f1f20] shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
      data-testid="display-settings-popover"
      ref={panelRef}
    >
      <div className="flex border-b border-[var(--track-border)]">
        <button
          className="flex-1 border-b-2 border-[#e57bd9] px-4 py-3 text-[13px] font-medium text-white"
          type="button"
        >
          Display settings
        </button>
        <button
          className="flex-1 px-4 py-3 text-[13px] font-medium text-[var(--track-text-muted)] hover:text-white"
          disabled
          type="button"
        >
          Calendar settings
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            Show all time entries
          </span>
          <button
            aria-checked={showAllEntries}
            className={`relative h-5 w-9 rounded-full transition ${
              showAllEntries ? "bg-[#e57bd9]" : "bg-[#4a4a4a]"
            }`}
            onClick={onToggleShowAllEntries}
            role="switch"
            type="button"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                showAllEntries ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <SettingsRow label="Extra visualizations" value="Weekly projects" />
        <SettingsRow label="Calendar hours" value="Show all hours" />
        <SettingsRow label="Today/Week total" value="Total hours" />
      </div>

      <div className="border-t border-[var(--track-border)] px-5 py-3">
        <SettingsLink href="/profile#time-and-date" label="Time and date settings" />
        <SettingsLink href="/profile#shortcuts" label="Keyboard shortcuts" />
        <SettingsLink href="/profile#timer-page" label="Time Entry Grouping" />
      </div>

      <div className="flex gap-3 border-t border-[var(--track-border)] px-5 py-4">
        <button
          className="flex-1 rounded-lg border border-[var(--track-border)] bg-transparent px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[var(--track-row-hover)]"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-lg bg-[#e57bd9] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#d06bc8]"
          onClick={onClose}
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <button className="flex w-full items-center justify-between py-2.5 text-left" type="button">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {label}
      </span>
      <span className="flex items-center gap-1 text-[13px] text-white">
        {value}
        <TrackingIcon className="size-3 text-[var(--track-text-muted)]" name="chevron-down" />
      </span>
    </button>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }): ReactElement {
  return (
    <a
      className="flex w-full items-center justify-between py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)] transition hover:text-white"
      href={href}
    >
      <span>{label}</span>
      <TrackingIcon className="size-3" name="chevron-right" />
    </a>
  );
}
