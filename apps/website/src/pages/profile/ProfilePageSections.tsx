import { AppButton, AppInlineNotice } from "@opentoggl/web-ui";
import { type ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("profile");
  return (
    <PreferenceCard description={t("emailPreferencesDescription")} title={t("emailPreferences")}>
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
  const { t } = useTranslation("profile");
  return (
    <PreferenceCard
      description={t("inAppNotificationsDescription")}
      title={t("inAppNotificationsPreferences")}
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
  const { t } = useTranslation("profile");
  return (
    <PreferenceCard description={t("timerPageDescription")} id="timer-page" title={t("timerPage")}>
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
  const { t } = useTranslation("profile");
  return (
    <PreferenceCard
      description={t("timeAndDateDescription")}
      id="time-and-date"
      title={t("timeAndDate")}
    >
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:gap-0">
        <div className="w-full md:w-[240px]">
          <PreferenceSelect
            label={t("durationDisplayFormat")}
            onChange={(value) => {
              props.setValue("durationFormat", value as PreferencesFormValues["durationFormat"]);
            }}
            options={durationFormatOptions}
            testId="pref-duration-format"
            value={String(props.getValue("durationFormat"))}
          />
          <PreferenceSelect
            label={t("timeFormat")}
            onChange={(value) => {
              props.setValue("timeofdayFormat", value as PreferencesFormValues["timeofdayFormat"]);
            }}
            options={timeFormatOptions}
            testId="pref-time-format"
            value={String(props.getValue("timeofdayFormat"))}
          />
        </div>
        <div className="w-full md:w-[240px]">
          <PreferenceSelect
            label={t("dateFormat")}
            onChange={(value) => {
              props.setValue("dateFormat", value);
            }}
            options={dateFormatOptions}
            testId="pref-date-format"
            value={String(props.getValue("dateFormat"))}
          />
          <PreferenceNumberSelect
            label={t("firstDayOfWeek")}
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
  const { t } = useTranslation("profile");
  return (
    <PreferenceCard id="shortcuts" title={t("keyboardShortcuts")}>
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
  siteUrl: string;
}): ReactElement {
  const { t } = useTranslation("profile");
  const baseUrl = (props.siteUrl || window.location.origin).replace(/\/+$/, "");
  const trackUrl = `${baseUrl}/api/v9`;
  const reportsUrl = `${baseUrl}/reports/api/v3`;
  const insightsUrl = `${baseUrl}/insights/api/v1`;
  const curlCommand = `curl ${trackUrl}/me \\
  -H "Content-Type: application/json" \\
  -u ${props.apiToken}:api_token`;

  return (
    <PreferenceCard
      action={
        <AppButton disabled={props.isResetPending} onClick={props.onReset} type="button">
          {props.isResetPending ? t("resetting") : t("reset")}
        </AppButton>
      }
      description={t("apiTokenDescription")}
      title={t("apiToken")}
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
          {t("openTogglNoRateLimits")}
        </p>

        <div className="mt-5 space-y-3">
          <p className="text-[13px] font-semibold text-[var(--track-text)]">{t("apiBaseUrls")}</p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="text-[var(--track-text-soft)]">{t("trackApiV9")}</span>
              <code className="rounded bg-[var(--track-surface)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--track-text-muted)]">
                {trackUrl}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--track-text-soft)]">{t("reportsApiV3")}</span>
              <code className="rounded bg-[var(--track-surface)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--track-text-muted)]">
                {reportsUrl}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--track-text-soft)]">{t("insightsApiV1")}</span>
              <code className="rounded bg-[var(--track-surface)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--track-text-muted)]">
                {insightsUrl}
              </code>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-[var(--track-text)]">
              {t("curlExample")}
            </p>
            <pre className="overflow-x-auto rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-3 font-mono text-[12px] leading-5 text-[var(--track-text-muted)]">
              {curlCommand}
            </pre>
          </div>
        </div>
      </div>
    </PreferenceCard>
  );
}

function ApiTokenCopyButton(props: { token: string }): ReactElement {
  const { t } = useTranslation("profile");
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

  const handleCopy = () => {
    void navigator.clipboard.writeText(props.token).then(() => {
      setCopied(true);
    });
  };

  return (
    <button
      aria-label={copied ? t("copied") : t("copyApiToken")}
      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] transition hover:text-white"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <CheckIcon className="size-4" strokeWidth="2" /> : <CopyIcon className="size-4" />}
    </button>
  );
}
