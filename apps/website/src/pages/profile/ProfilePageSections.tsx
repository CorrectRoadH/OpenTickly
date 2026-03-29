import { AppButton, AppInlineNotice } from "@opentoggl/web-ui";
import { type ReactElement, useCallback, useEffect, useState } from "react";

import type { PreferencesFormValues } from "../../shared/forms/profile-form.ts";
import { CheckIcon, CopyIcon } from "../../shared/ui/icons.tsx";
import {
  dateFormatOptions,
  durationFormatOptions,
  figmaEmailPreferences,
  figmaInAppPreferences,
  figmaShortcutPreferences,
  figmaTimerPreferences,
  firstDayOfWeekOptions,
  timeFormatOptions,
} from "./ProfilePageData.ts";
import {
  CheckboxRow,
  PreferenceCard,
  PreferenceNumberSelect,
  PreferenceSelect,
} from "./ProfilePagePrimitives.tsx";

export function EmailPreferencesSection(props: {
  getValue: <K extends keyof PreferencesFormValues>(key: K) => PreferencesFormValues[K];
  setValue: <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ) => void;
}): ReactElement {
  return (
    <PreferenceCard
      description="Specify which types of emails you'd like to receive"
      title="Email preferences"
    >
      <div className="px-5 py-[15px]">
        {figmaEmailPreferences.map((item) => (
          <CheckboxRow
            checked={Boolean(props.getValue(item.key))}
            key={item.key}
            label={item.label}
            onChange={(checked) => {
              props.setValue(item.key, checked as PreferencesFormValues[typeof item.key]);
            }}
          />
        ))}
      </div>
    </PreferenceCard>
  );
}

export function InAppNotificationsSection(props: {
  getValue: <K extends keyof PreferencesFormValues>(key: K) => PreferencesFormValues[K];
  setValue: <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ) => void;
}): ReactElement {
  return (
    <PreferenceCard
      description="Select which types of notifications you'd like to be notified"
      title="In-app notifications preferences"
    >
      <div className="grid gap-0 px-5 py-[15px] md:grid-cols-2">
        {figmaInAppPreferences.map((item) => (
          <div key={item.key}>
            <p className="mb-0 text-[11px] font-semibold uppercase leading-4 text-[var(--track-text-soft)]">
              {item.section}
            </p>
            <CheckboxRow
              className="px-0"
              checked={Boolean(props.getValue(item.key))}
              label={item.label}
              onChange={(checked) => {
                props.setValue(item.key, checked as PreferencesFormValues[typeof item.key]);
              }}
            />
          </div>
        ))}
      </div>
    </PreferenceCard>
  );
}

export function TimerPageSection(props: {
  getValue: <K extends keyof PreferencesFormValues>(key: K) => PreferencesFormValues[K];
  setValue: <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ) => void;
}): ReactElement {
  return (
    <PreferenceCard
      description="Define your preferences for a better workflow"
      id="timer-page"
      title="Timer page"
    >
      <div className="px-5 py-[15px]">
        <div className="w-full max-w-[500px]">
          {figmaTimerPreferences.map((item) => (
            <CheckboxRow
              checked={Boolean(props.getValue(item.key))}
              key={item.key}
              label={item.label}
              onChange={(checked) => {
                props.setValue(item.key, checked as PreferencesFormValues[typeof item.key]);
              }}
            />
          ))}
        </div>
      </div>
    </PreferenceCard>
  );
}

export function TimeAndDateSection(props: {
  getValue: <K extends keyof PreferencesFormValues>(key: K) => PreferencesFormValues[K];
  setValue: <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ) => void;
}): ReactElement {
  return (
    <PreferenceCard
      description="Choose how your times are shown across Toggl Track"
      id="time-and-date"
      title="Time and date"
    >
      <div className="flex flex-wrap gap-0 px-0 py-5">
        <div className="w-[240px] px-5">
          <PreferenceSelect
            label="Duration Display Format"
            onChange={(value) => {
              props.setValue("durationFormat", value as PreferencesFormValues["durationFormat"]);
            }}
            options={durationFormatOptions}
            testId="pref-duration-format"
            value={String(props.getValue("durationFormat"))}
          />
          <PreferenceSelect
            label="Time Format"
            onChange={(value) => {
              props.setValue("timeofdayFormat", value as PreferencesFormValues["timeofdayFormat"]);
            }}
            options={timeFormatOptions}
            testId="pref-time-format"
            value={String(props.getValue("timeofdayFormat"))}
          />
        </div>
        <div className="w-[240px] px-5">
          <PreferenceSelect
            label="Date Format"
            onChange={(value) => {
              props.setValue("dateFormat", value);
            }}
            options={dateFormatOptions}
            testId="pref-date-format"
            value={String(props.getValue("dateFormat"))}
          />
          <PreferenceNumberSelect
            label="First day of the week"
            onChange={(value) => {
              props.setValue("beginningOfWeek", value);
            }}
            options={firstDayOfWeekOptions}
            testId="pref-first-day-of-week"
            value={Number(props.getValue("beginningOfWeek"))}
          />
        </div>
      </div>
    </PreferenceCard>
  );
}

export function KeyboardShortcutsSection(props: {
  getValue: <K extends keyof PreferencesFormValues>(key: K) => PreferencesFormValues[K];
  setValue: <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ) => void;
}): ReactElement {
  return (
    <PreferenceCard id="shortcuts" title="Keyboard shortcuts">
      <div className="grid gap-0 px-0 py-[15px] md:grid-cols-[500px_minmax(0,1fr)]">
        <div className="px-5">
          <CheckboxRow
            checked={Boolean(props.getValue(figmaShortcutPreferences[0].key))}
            helper={figmaShortcutPreferences[0].helper}
            label={figmaShortcutPreferences[0].label}
            onChange={(checked) => {
              props.setValue(
                figmaShortcutPreferences[0].key,
                checked as PreferencesFormValues[(typeof figmaShortcutPreferences)[0]["key"]],
              );
            }}
          />
        </div>
        <div className="px-5">
          {figmaShortcutPreferences.slice(1).map((item) => (
            <CheckboxRow
              checked={Boolean(props.getValue(item.key))}
              key={item.key}
              label={item.label}
              onChange={(checked) => {
                props.setValue(item.key, checked as PreferencesFormValues[typeof item.key]);
              }}
            />
          ))}
        </div>
      </div>
    </PreferenceCard>
  );
}

export function ApiTokenStatusNotices(props: {
  apiTokenError: string | null;
  apiTokenStatus: string | null;
}): ReactElement | null {
  if (!props.apiTokenStatus && !props.apiTokenError) {
    return null;
  }

  return (
    <>
      {props.apiTokenStatus ? (
        <AppInlineNotice
          className="border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-accent-text)]"
          tone="success"
        >
          {props.apiTokenStatus}
        </AppInlineNotice>
      ) : null}
      {props.apiTokenError ? (
        <AppInlineNotice tone="error">{props.apiTokenError}</AppInlineNotice>
      ) : null}
    </>
  );
}

export function ApiTokenSection(props: {
  apiToken: string;
  isResetPending: boolean;
  onReset: () => void;
}): ReactElement {
  return (
    <PreferenceCard
      action={
        <AppButton
          disabled={props.isResetPending}
          onClick={props.onReset}
          tone="secondary"
          type="button"
        >
          {props.isResetPending ? "Resetting..." : "Reset"}
        </AppButton>
      }
      description="This is a unique identifier used to authenticate you to Toggl Track. Keep your Token private to avoid sharing sensitive information."
      title="API Token"
    >
      <div className="px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <input
            className="h-[37px] flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text-muted)]"
            readOnly
            value={props.apiToken}
          />
          <ApiTokenCopyButton token={props.apiToken} />
        </div>
        <p className="mt-4 text-[14px] font-medium leading-5 text-[var(--track-text)]">
          OpenToggl has no rate limits.
        </p>
      </div>
    </PreferenceCard>
  );
}

function ApiTokenCopyButton(props: { token: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(props.token).then(() => {
      setCopied(true);
    });
  }, [props.token]);

  return (
    <button
      aria-label={copied ? "Copied" : "Copy API token"}
      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] transition hover:text-white"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <CheckIcon className="size-4" strokeWidth="2" /> : <CopyIcon className="size-4" />}
    </button>
  );
}
