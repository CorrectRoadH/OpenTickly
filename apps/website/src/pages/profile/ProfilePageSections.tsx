import { AppInlineNotice } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

import type { PreferencesFormValues } from "../../shared/forms/profile-form.ts";
import { ShellSecondaryButton } from "../../shared/ui/TrackDirectoryPrimitives.tsx";
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
  IntegrationTile,
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
    <PreferenceCard description="Define your preferences for a better workflow" title="Timer page">
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

export function ExternalCalendarsSection(): ReactElement {
  return (
    <PreferenceCard
      action={
        <ShellSecondaryButton disabled type="button">
          Go to calendar
        </ShellSecondaryButton>
      }
      description="Connect a calendar to see your events and easily create Time Entries. Connected calendar events are private - only you can see them. Find out more"
      title="External calendars"
    >
      <div className="flex gap-5 px-5 py-[15px]">
        <IntegrationTile accent="#ffde91" title="Google Calendar" />
        <IntegrationTile accent="#4ca4ff" title="Outlook Calendar" />
      </div>
    </PreferenceCard>
  );
}

export function SingleSignOnSection(): ReactElement {
  return (
    <PreferenceCard
      description="Set up single sign-on with identity providers that support the SAML protocol. See detailed instructions."
      title="Single sign-on (SSO)"
    >
      <div className="px-5 py-[15px]">
        <ShellSecondaryButton disabled type="button">
          Create SSO profile
        </ShellSecondaryButton>
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
      title="Time and date"
    >
      <div className="flex flex-wrap gap-0 px-0 py-5">
        <div className="w-[240px] px-5">
          <PreferenceSelect
            label="Duration Display Format"
            onChange={(value) => {
              props.setValue("durationFormat", value);
            }}
            options={durationFormatOptions}
            value={String(props.getValue("durationFormat"))}
          />
          <PreferenceSelect
            label="Time Format"
            onChange={(value) => {
              props.setValue("timeofdayFormat", value);
            }}
            options={timeFormatOptions}
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
            value={String(props.getValue("dateFormat"))}
          />
          <PreferenceNumberSelect
            label="First day of the week"
            onChange={(value) => {
              props.setValue("beginningOfWeek", value);
            }}
            options={firstDayOfWeekOptions}
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
    <PreferenceCard title="Keyboard shortcuts">
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
        <AppInlineNotice className="border-rose-500/30 bg-[#23181b] text-rose-200" tone="error">
          {props.apiTokenError}
        </AppInlineNotice>
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
        <ShellSecondaryButton disabled={props.isResetPending} onClick={props.onReset} type="button">
          {props.isResetPending ? "Resetting..." : "Reset"}
        </ShellSecondaryButton>
      }
      description="This is a unique identifier used to authenticate you to Toggl Track. Keep your Token private to avoid sharing sensitive information."
      title="API Token"
    >
      <div className="px-[18px] py-[15px]">
        <input
          className="h-[37px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text-muted)]"
          readOnly
          value={props.apiToken}
        />
        <div className="mt-4 space-y-1 text-[14px] font-medium leading-5 text-[var(--track-text)]">
          <p>You&apos;ve used 0 / 30 requests in personal company (Free)</p>
          <p>You&apos;ve used 0 / 30 requests from user specific requests quota</p>
          <p className="pt-3 text-[12px] leading-4 text-[var(--track-text-muted)]">
            Learn more about API limits, or upgrade your plan for increased access.
          </p>
        </div>
      </div>
    </PreferenceCard>
  );
}
