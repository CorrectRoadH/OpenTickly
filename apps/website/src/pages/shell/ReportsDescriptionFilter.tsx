import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton, AppInput } from "@opentickly/web-ui";

import { useDismiss } from "../../shared/ui/useDismiss.ts";

type ReportsDescriptionFilterProps = {
  onChange: (value: string) => void;
  value: string;
};

/**
 * A text search dropdown for filtering report entries by description.
 * Opens a panel with an input field; applies on Enter or button click.
 */
export function ReportsDescriptionFilter({
  onChange,
  value,
}: ReportsDescriptionFilterProps): ReactElement {
  const { t } = useTranslation("reports");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownId = useId();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const closeDropdown = () => setOpen(false);
  useDismiss(containerRef, open, closeDropdown);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const hasValue = value.trim().length > 0;
  const buttonLabel = hasValue ? t("descriptionWithValue", { value }) : t("descriptionFilter");

  function applyFilter() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={open ? dropdownId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`h-10 max-w-[220px] truncate rounded-[8px] border-2 px-3 text-[12px] font-semibold shadow-[var(--track-depth-shadow-rest)] transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)] ${
          hasValue
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
        }`}
        data-testid="reports-filter-description"
        onClick={() => setOpen(!open)}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[260px] rounded-[8px] border-2 border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] p-3 shadow-[0_14px_32px_var(--track-shadow-overlay)]"
          data-testid="reports-filter-description-dropdown"
          id={dropdownId}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            {t("filterByDescription")}
          </p>
          <AppInput
            className="h-9 rounded-[8px]"
            data-testid="reports-filter-description-input"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilter();
            }}
            placeholder={t("containsPlaceholder")}
            ref={inputRef}
            size="sm"
            value={draft}
          />
          <div className="mt-2 flex items-center gap-2">
            <AppButton
              data-testid="reports-filter-description-apply"
              onClick={applyFilter}
              size="sm"
              type="button"
            >
              {t("apply")}
            </AppButton>
            {hasValue ? (
              <AppButton
                onClick={() => {
                  setDraft("");
                  onChange("");
                  setOpen(false);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                {t("clear")}
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
