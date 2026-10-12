import {
  type ChangeEvent,
  type ReactElement,
  type Ref,
  type LegacyRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon } from "../../shared/ui/icons.tsx";
import { type TimeFormat, formatClockTime } from "./overview-data.ts";

export function TimeDisplay({
  dialogRootTestId,
  dateAriaLabel,
  datePickerTriggerRef,
  editing,
  hasError = false,
  onDateClick,
  onEditEnd,
  onEditStart,
  onTimeCommit,
  time,
  timeAriaLabel,
  timeValue,
  timeofdayFormat,
  timezone,
}: {
  dialogRootTestId?: string;
  dateAriaLabel: string;
  datePickerTriggerRef?: Ref<HTMLButtonElement | null>;
  editing: boolean;
  hasError?: boolean;
  onDateClick: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onTimeCommit: (value: string) => void;
  time: Date;
  timeAriaLabel: string;
  timeValue: string;
  timeofdayFormat: TimeFormat;
  timezone: string;
}): ReactElement {
  const { t } = useTranslation("tracking");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedByKeyRef = useRef(false);
  const [draft, setDraft] = useState(timeValue);

  useEffect(() => {
    if (editing) {
      committedByKeyRef.current = false;
      setDraft(timeValue);
    }
  }, [editing, timeValue]);

  const borderColor = hasError
    ? "border-rose-400"
    : editing
      ? "border-[var(--track-accent-secondary)]"
      : "border-[var(--track-control-border-contrast)] hover:border-[var(--track-overlay-text-soft)]";

  return (
    <div
      className={`relative flex h-[38px] shrink-0 items-center rounded-[10px] border bg-[var(--track-control-surface)] transition ${borderColor}`}
    >
      {editing ? (
        <label className="block">
          <span className="sr-only">{t("editTime")}</span>
          <input
            aria-label={t("editTime")}
            aria-invalid={hasError}
            autoFocus
            data-testid={dialogRootTestId ? `${dialogRootTestId}-time-input` : undefined}
            className="h-[36px] w-[68px] min-w-0 rounded-l-[9px] bg-transparent pl-3 pr-1 text-[12px] font-semibold tabular-nums text-[var(--track-text)] outline-none"
            value={draft}
            inputMode="numeric"
            onBlur={(event) => {
              if (committedByKeyRef.current) return;
              onTimeCommit(event.currentTarget.value);
              onEditEnd();
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                committedByKeyRef.current = true;
                onTimeCommit(inputRef.current?.value ?? draft);
                onEditEnd();
                return;
              }

              if (event.key === "Escape") {
                committedByKeyRef.current = true;
                setDraft(timeValue);
                onEditEnd();
              }
            }}
            placeholder="HH:MM"
            ref={inputRef}
            spellCheck={false}
            type="text"
          />
        </label>
      ) : (
        <button
          aria-label={timeAriaLabel}
          className="flex h-full items-center whitespace-nowrap pl-3 pr-1 text-[12px] font-semibold tabular-nums text-[var(--track-text)]"
          onClick={onEditStart}
          type="button"
        >
          {formatClockTime(time, timezone, timeofdayFormat)}
        </button>
      )}
      <button
        aria-label={dateAriaLabel}
        className="flex h-full items-center justify-center pl-1 pr-2.5 text-[var(--track-overlay-icon-subtle)] transition hover:text-white"
        onClick={onDateClick}
        ref={datePickerTriggerRef as LegacyRef<HTMLButtonElement>}
        type="button"
      >
        <CalendarIcon className="size-3.5" />
      </button>
      {hasError ? (
        <span className="absolute -bottom-5 left-0 whitespace-nowrap text-[11px] text-rose-400">
          {t("invalidTime")}
        </span>
      ) : null}
    </div>
  );
}
