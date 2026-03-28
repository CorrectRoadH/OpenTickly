import { type ReactElement, useEffect, useRef, useState } from "react";

import { ChevronDownIcon, ChevronRightIcon } from "../../shared/ui/icons.tsx";

export type DisplaySettings = {
  calendarHours: "all" | "business";
  extraVisualizations: "off" | "weekly-projects";
  todayWeekTotal: "hours" | "earnings";
};

const STORAGE_KEY = "opentoggl:display-settings";

const DEFAULTS: DisplaySettings = {
  calendarHours: "all",
  extraVisualizations: "off",
  todayWeekTotal: "hours",
};

export function readDisplaySettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    return {
      calendarHours: parsed.calendarHours === "business" ? "business" : "all",
      extraVisualizations:
        parsed.extraVisualizations === "weekly-projects" ? "weekly-projects" : "off",
      todayWeekTotal: parsed.todayWeekTotal === "earnings" ? "earnings" : "hours",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeDisplaySettings(settings: DisplaySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable -- ignore
  }
}

export function DisplaySettingsPopover({
  onClose,
  onDisplaySettingsChange,
  showAllEntries,
  onToggleShowAllEntries,
}: {
  onClose: () => void;
  onDisplaySettingsChange?: (settings: DisplaySettings) => void;
  onToggleShowAllEntries: () => void;
  showAllEntries: boolean;
}): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DisplaySettings>(() => readDisplaySettings());

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

  function handleSave() {
    writeDisplaySettings(draft);
    onDisplaySettingsChange?.(draft);
    onClose();
  }

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

        <SettingsDropdown
          label="Extra visualizations"
          value={draft.extraVisualizations}
          options={[
            { label: "Off", value: "off" },
            { label: "Weekly projects", value: "weekly-projects" },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              extraVisualizations: value as DisplaySettings["extraVisualizations"],
            }))
          }
        />
        <SettingsDropdown
          label="Calendar hours"
          value={draft.calendarHours}
          options={[
            { label: "Show all hours", value: "all" },
            { label: "Business hours only (9-17)", value: "business" },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              calendarHours: value as DisplaySettings["calendarHours"],
            }))
          }
        />
        <SettingsDropdown
          label="Today/Week total"
          value={draft.todayWeekTotal}
          options={[
            { label: "Total hours", value: "hours" },
            { label: "Total earnings", value: "earnings" },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              todayWeekTotal: value as DisplaySettings["todayWeekTotal"],
            }))
          }
        />
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
          onClick={handleSave}
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SettingsDropdown({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="flex w-full items-center justify-between py-2.5 text-left"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          {label}
        </span>
        <span className="flex items-center gap-1 text-[13px] text-white">
          {selectedOption?.label ?? value}
          <ChevronDownIcon className="size-3 text-[var(--track-text-muted)]" />
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 min-w-[200px] rounded-[10px] border border-[#3d3d42] bg-[#242426] py-1 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
          {options.map((option) => (
            <button
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition hover:bg-white/4 ${
                option.value === value ? "text-[#e57bd9]" : "text-[#d8d8dc]"
              }`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <span className="text-[11px] text-[#e57bd9]">&#10003;</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }): ReactElement {
  return (
    <a
      className="flex w-full items-center justify-between py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)] transition hover:text-white"
      href={href}
    >
      <span>{label}</span>
      <ChevronRightIcon className="size-3" />
    </a>
  );
}
