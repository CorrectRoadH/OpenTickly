import { type ReactElement, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@opentickly/web-ui";

import { CalendarPanel } from "./CalendarPanel.tsx";
import { TimeDisplay } from "./EditorTimeDisplay.tsx";
import { formatClockDuration, resolveEntryDurationSeconds } from "./overview-data.ts";
import { useEditorContext } from "./TimeEntryEditorContext.tsx";
import { applyTimeInputValue, toTimeInputValue } from "./time-entry-editor-utils.ts";

export function EditorTimeRow(): ReactElement {
  const { t } = useTranslation("tracking");
  const ctx = useEditorContext();
  const {
    durationFormat,
    entry,
    isNewEntry,
    isSaving,
    onSave,
    onStartTimeChange,
    onStopTimeChange,
    saveError,
    timeofdayFormat,
    timezone,
    dispatch,
    ui: { timeEditor, timePicker },
  } = ctx;

  const startIso = entry.start ?? entry.at ?? new Date().toISOString();
  const stopIso = entry.stop ?? null;
  const start = new Date(startIso);
  const stop = stopIso ? new Date(stopIso) : null;
  const duration = formatClockDuration(resolveEntryDurationSeconds(entry), durationFormat);
  const startDatePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const stopDatePickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  function applyEditedTime(target: "start" | "stop", value: string) {
    const baseDate = target === "start" ? start : stop;
    if (!baseDate) {
      return;
    }

    const nextDate = applyTimeInputValue(baseDate, value, timezone);
    if (!nextDate) {
      dispatch({ type: "SET_TIME_INPUT_ERROR", error: target });
      return;
    }

    dispatch({ type: "SET_TIME_INPUT_ERROR", error: null });
    if (target === "start") {
      onStartTimeChange(nextDate);
      return;
    }

    onStopTimeChange(nextDate);
  }

  return (
    <div className="mt-5">
      <div className="relative min-w-0 overflow-visible">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TimeDisplay
            dialogRootTestId="time-entry-editor-dialog"
            dateAriaLabel="Edit start date"
            datePickerTriggerRef={startDatePickerTriggerRef}
            editing={timeEditor === "start"}
            hasError={ctx.ui.timeInputError === "start"}
            onDateClick={() => {
              dispatch({ type: "SET_TIME_EDITOR", timeEditor: null });
              dispatch({ type: "SET_TIME_PICKER", timePicker: "start" });
            }}
            onEditEnd={() => {
              dispatch({ type: "SET_TIME_EDITOR", timeEditor: null });
            }}
            onEditStart={() => {
              dispatch({ type: "SET_TIME_PICKER", timePicker: null });
              dispatch({ type: "SET_TIME_EDITOR", timeEditor: "start" });
            }}
            onTimeCommit={(value) => applyEditedTime("start", value)}
            time={start}
            timeAriaLabel="Edit start time"
            timeValue={toTimeInputValue(start, timezone)}
            timeofdayFormat={timeofdayFormat}
            timezone={timezone}
          />
          <svg
            aria-hidden="true"
            className="shrink-0 text-[var(--track-control-border-contrast)]"
            fill="none"
            height="8"
            viewBox="0 0 12 8"
            width="15"
          >
            <g fill="currentColor" fillRule="evenodd">
              <rect height="2" width="7" x="0" y="3" />
              <polygon points="7 8, 7 0, 12 4" />
            </g>
          </svg>
          {stop ? (
            <TimeDisplay
              dialogRootTestId="time-entry-editor-dialog"
              dateAriaLabel="Edit stop date"
              datePickerTriggerRef={stopDatePickerTriggerRef}
              editing={timeEditor === "stop"}
              hasError={ctx.ui.timeInputError === "stop"}
              onDateClick={() => {
                dispatch({ type: "SET_TIME_EDITOR", timeEditor: null });
                dispatch({ type: "SET_TIME_PICKER", timePicker: "stop" });
              }}
              onEditEnd={() => {
                dispatch({ type: "SET_TIME_EDITOR", timeEditor: null });
              }}
              onEditStart={() => {
                dispatch({ type: "SET_TIME_PICKER", timePicker: null });
                dispatch({ type: "SET_TIME_EDITOR", timeEditor: "stop" });
              }}
              onTimeCommit={(value) => applyEditedTime("stop", value)}
              time={stop}
              timeAriaLabel="Edit stop time"
              timeValue={stop ? toTimeInputValue(stop, timezone) : ""}
              timeofdayFormat={timeofdayFormat}
              timezone={timezone}
            />
          ) : (
            <span className="flex h-[38px] shrink-0 items-center rounded-[10px] border border-[var(--track-control-border-contrast)] px-3 text-[14px] font-semibold tabular-nums text-[var(--track-control-border-contrast)]">
              {t("running")}
            </span>
          )}
          <span className="flex h-[38px] shrink-0 items-center justify-center px-1 text-[11px] tabular-nums text-[var(--track-overlay-text-muted)]">
            {duration}
          </span>
          <AppButton
            className="ml-auto"
            disabled={isSaving}
            onClick={() => {
              if (!isSaving) {
                void onSave();
              }
            }}
            type="button"
            variant="primary"
          >
            {isSaving
              ? isNewEntry
                ? t("adding")
                : t("loading")
              : isNewEntry
                ? t("addTimeEntry")
                : t("save")}
          </AppButton>
        </div>

        {timePicker ? (
          <div
            className="absolute left-0 z-50"
            style={{ top: "calc(100% + 8px)" }}
            data-testid={`time-entry-editor-${timePicker}-date-picker`}
          >
            <CalendarPanel
              date={timePicker === "start" ? start : stop!}
              onClose={() => dispatch({ type: "SET_TIME_PICKER", timePicker: null })}
              onSelect={(nextDate) => {
                if (timePicker === "start") {
                  onStartTimeChange(nextDate);
                } else {
                  onStopTimeChange(nextDate);
                }
                dispatch({ type: "SET_TIME_PICKER", timePicker: null });
              }}
            />
          </div>
        ) : null}
      </div>

      {saveError ? <p className="mt-4 text-[12px] text-rose-300">{saveError}</p> : null}
    </div>
  );
}
