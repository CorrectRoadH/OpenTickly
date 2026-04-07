import { type ReactElement, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDownIcon, ChevronRightIcon } from "../../shared/ui/icons.tsx";
import { useDismiss } from "../../shared/ui/useDismiss.ts";

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
  const { t } = useTranslation("tracking");
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DisplaySettings>(() => readDisplaySettings());

  useDismiss(panelRef, true, onClose);

  function handleSave() {
    writeDisplaySettings(draft);
    onDisplaySettingsChange?.(draft);
    onClose();
  }

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-[var(--track-border)] bg-[var(--track-overlay-surface)] shadow-[0_14px_32px_var(--track-shadow-overlay)]"
      data-testid="display-settings-popover"
      ref={panelRef}
    >
      <div className="border-b border-[var(--track-border)] px-4 py-3">
        <span className="text-[12px] font-medium text-white">{t("displaySettings")}</span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
            {t("showAllTimeEntries")}
          </span>
          <button
            aria-checked={showAllEntries}
            className={`relative h-5 w-9 rounded-full transition ${
              showAllEntries ? "bg-[var(--track-accent)]" : "bg-[var(--track-control-disabled)]"
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
          label={t("extraVisualizations")}
          value={draft.extraVisualizations}
          options={[
            { label: t("off"), value: "off" },
            { label: t("weeklyProjects"), value: "weekly-projects" },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              extraVisualizations: value as DisplaySettings["extraVisualizations"],
            }))
          }
        />
        <SettingsDropdown
          label={t("calendarHours")}
          value={draft.calendarHours}
          options={[
            { label: t("showAllHours"), value: "all" },
            { label: t("businessHoursOnly"), value: "business" },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              calendarHours: value as DisplaySettings["calendarHours"],
            }))
          }
        />
        <SettingsDropdown
          label={t("todayWeekTotal")}
          value={draft.todayWeekTotal}
          options={[
            { label: t("totalHours"), value: "hours" },
            { label: t("totalEarnings"), value: "earnings" },
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
        <SettingsLink href="/profile#time-and-date" label={t("timeAndDateSettings")} />
        <SettingsLink href="/profile#shortcuts" label={t("keyboardShortcuts")} />
        <SettingsLink href="/profile#timer-page" label={t("timeEntryGrouping")} />
      </div>

      <div className="flex gap-3 border-t border-[var(--track-border)] px-5 py-4">
        <button
          className="flex-1 rounded-lg border border-[var(--track-border)] bg-transparent px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[var(--track-row-hover)]"
          onClick={onClose}
          type="button"
        >
          {t("cancel")}
        </button>
        <button
          className="flex-1 rounded-lg bg-[var(--track-accent)] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[var(--track-accent-fill-hover)]"
          onClick={handleSave}
          type="button"
        >
          {t("save")}
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
  const closeDropdown = () => setOpen(false);
  useDismiss(containerRef, open, closeDropdown);

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
        <span className="flex items-center gap-1 text-[12px] text-white">
          {selectedOption?.label ?? value}
          <ChevronDownIcon className="size-3 text-[var(--track-text-muted)]" />
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 min-w-[200px] rounded-[10px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] py-1 shadow-[0_12px_28px_var(--track-shadow-overlay)]">
          {options.map((option) => (
            <button
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] transition hover:bg-white/4 ${
                option.value === value
                  ? "text-[var(--track-accent)]"
                  : "text-[var(--track-overlay-text)]"
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
                <span className="text-[11px] text-[var(--track-accent)]">✓</span>
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
