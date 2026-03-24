import { AppInlineNotice, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  createPreferencesFormValues,
  mapPreferencesFormToRequest,
  type PreferencesFormValues,
} from "../../shared/forms/profile-form.ts";
import {
  useResetApiTokenMutation,
  usePreferencesQuery,
  useProfileQuery,
  useUpdatePreferencesMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  ShellPageHeader,
  ShellSecondaryButton,
  ShellSurfaceCard,
  ShellToast,
} from "../../shared/ui/TrackDirectoryPrimitives.tsx";
import {
  CheckboxRow,
  IntegrationTile,
  ProfileBetaProgramCard,
  ProfileHeroCard,
  PreferenceCard,
  PreferenceNumberSelect,
  PreferenceSelect,
} from "./ProfilePagePrimitives.tsx";

const figmaEmailPreferences = [
  {
    key: "sendProductEmails",
    label: "Toggl Track can send newsletters by email",
  },
  {
    key: "sendWeeklyReport",
    label: "Weekly overview of tracked time",
  },
  {
    key: "sendTimerNotifications",
    label: "Email about long running (over 8 hours) time entries",
  },
  {
    key: "sendDailyProjectInvites",
    label: "Notify me when I'm added to a new project",
  },
] satisfies ReadonlyArray<{ key: keyof PreferencesFormValues; label: string }>;

const figmaInAppPreferences = [
  {
    key: "sendAddedToProjectNotification",
    label: "Notify me when I am added to projects and tasks",
    section: "Projects",
  },
  {
    key: "sendProductReleaseNotification",
    label: "Notify me when a new feature is released",
    section: "Product releases",
  },
] as const;

const figmaTimerPreferences = [
  {
    key: "collapseTimeEntries",
    label: "Group similar time entries",
  },
  {
    key: "showTimeInTitle",
    label: "Show running time in the title bar",
  },
  {
    key: "showAnimations",
    label: "Show animations",
  },
  {
    key: "isGoalsViewShown",
    label: "Show goals view",
  },
] satisfies ReadonlyArray<{ key: keyof PreferencesFormValues; label: string }>;

const figmaShortcutPreferences = [
  {
    helper: 'Press question mark "?" to see available keyboard shortcuts',
    key: "keyboardShortcutsEnabled",
    label: "Allow using keyboard shortcuts",
  },
  {
    key: "projectShortcutEnabled",
    label: "Allow using @ shortcut to assign a Project in the Timer Description field",
  },
  {
    key: "tagsShortcutEnabled",
    label: "Allow using # shortcut to assign a Tag in the Timer Description field",
  },
] satisfies ReadonlyArray<{ helper?: string; key: keyof PreferencesFormValues; label: string }>;

const durationFormatOptions = [
  { label: "Classic", value: "classic" },
  { label: "Decimal", value: "decimal" },
  { label: "Improved (0:47:06)", value: "improved" },
] as const;

const dateFormatOptions = [
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
  { label: "MM-DD-YYYY", value: "MM-DD-YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
] as const;

const timeFormatOptions = [
  { label: "24-hour", value: "HH:mm" },
  { label: "12-hour", value: "h:mm A" },
] as const;

const firstDayOfWeekOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
] as const;

const defaultPreferencesFormValues: PreferencesFormValues = {
  beginningOfWeek: 1,
  collapseTimeEntries: true,
  dateFormat: "YYYY-MM-DD",
  durationFormat: "improved",
  isGoalsViewShown: true,
  keyboardShortcutsEnabled: true,
  manualEntryMode: "timer",
  projectShortcutEnabled: false,
  sendAddedToProjectNotification: true,
  sendDailyProjectInvites: true,
  sendProductEmails: true,
  sendProductReleaseNotification: true,
  sendTimerNotifications: true,
  sendWeeklyReport: true,
  showAnimations: true,
  showTimeInTitle: true,
  tagsShortcutEnabled: false,
  timeofdayFormat: "HH:mm",
};

export function ProfilePage(): ReactElement {
  const session = useSession();
  const profileQuery = useProfileQuery();
  const preferencesQuery = usePreferencesQuery();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const resetApiTokenMutation = useResetApiTokenMutation();
  const [apiTokenStatus, setApiTokenStatus] = useState<string | null>(null);
  const [apiTokenError, setApiTokenError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    description: string;
    title: string;
    tone: "error" | "success";
  } | null>(null);
  const form = useForm<PreferencesFormValues>({
    defaultValues: defaultPreferencesFormValues,
  });
  const watchedPreferences = useWatch({
    control: form.control,
  });
  const lastSavedValuesRef = useRef(JSON.stringify(defaultPreferencesFormValues));
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingRetryRef = useRef(false);
  const preferenceValues = createPreferencesFormValues(preferencesQuery.data ?? {});

  useEffect(() => {
    form.reset(preferenceValues);
    lastSavedValuesRef.current = JSON.stringify(preferenceValues);
  }, [form, preferenceValues]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      clearTimeout(timeout);
    };
  }, [toast]);

  useEffect(() => {
    if (!form.formState.isDirty) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveLatestValues();
    }, 900);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form.formState.isDirty, watchedPreferences]);

  async function saveLatestValues(): Promise<void> {
    const latestValues = form.getValues();
    const serializedValues = JSON.stringify(latestValues);

    if (serializedValues === lastSavedValuesRef.current) {
      return;
    }

    if (saveInFlightRef.current) {
      pendingRetryRef.current = true;
      return;
    }

    saveInFlightRef.current = true;

    try {
      await updatePreferencesMutation.mutateAsync(mapPreferencesFormToRequest(latestValues));
      lastSavedValuesRef.current = serializedValues;
      form.reset(latestValues);
      setToast({
        description: "Your profile preferences have been updated",
        title: "Success!",
        tone: "success",
      });
    } catch {
      setToast({
        description: "We could not save this change. Try again in a moment.",
        title: "Could not save profile",
        tone: "error",
      });
    } finally {
      saveInFlightRef.current = false;

      if (pendingRetryRef.current) {
        pendingRetryRef.current = false;
        void saveLatestValues();
      }
    }
  }

  if (profileQuery.isPending || preferencesQuery.isPending) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Fetching current user account details and preferences."
          title="Loading profile"
          tone="loading"
        />
      </ShellSurfaceCard>
    );
  }

  if (profileQuery.isError || preferencesQuery.isError) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-rose-200"
          description="We could not load account details right now. Refresh or try again shortly."
          title="Profile unavailable"
          tone="error"
        />
      </ShellSurfaceCard>
    );
  }

  if (!profileQuery.data || !preferencesQuery.data) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="No profile data was returned for this session."
          title="Profile data unavailable"
          tone="empty"
        />
      </ShellSurfaceCard>
    );
  }

  const profileName =
    profileQuery.data.fullname || session.user.fullName || profileQuery.data.email;
  const reportsTimezone = formatReportsTimezone(
    String(preferencesQuery.data.pg_time_zone_name || profileQuery.data.timezone || "UTC"),
  );

  const heroRows = [
    { label: "Full name", value: profileName || "Unnamed user" },
    { label: "Email", value: profileQuery.data.email || "No email configured" },
    { label: "Reports timezone", value: reportsTimezone },
    { label: "Google sign-in", value: "Enabled" },
    { label: "Apple sign-in", value: "Enabled" },
    { label: "Passkey sign-in", value: "Enabled" },
    { label: "2FA sign-in", value: profileQuery.data["2fa_enabled"] ? "Enabled" : "Not enabled" },
  ];

  return (
    <div className="space-y-4 pb-6" data-testid="profile-page">
      <section className="sticky top-0 z-10 bg-[var(--track-surface)]">
        <ShellPageHeader
          action={
            <ShellSecondaryButton disabled type="button">
              Export account data
            </ShellSecondaryButton>
          }
          bordered
          title="My Profile"
        />
      </section>

      <section className="flex gap-3 px-3 pb-10 pt-3">
        <div className="w-full max-w-[1352px] space-y-4">
          <ProfileHeroCard
            accountSettingsHref="https://track.toggl.com/account"
            avatarImageUrl={profileQuery.data.image_url ?? session.user.imageUrl}
            profileName={profileName || "Unnamed user"}
            rows={heroRows}
          />

          <PreferenceCard
            description="Specify which types of emails you'd like to receive"
            title="Email preferences"
          >
            <div className="px-5 py-[15px]">
              {figmaEmailPreferences.map((item) => (
                <CheckboxRow
                  checked={form.watch(item.key)}
                  key={item.key}
                  label={item.label}
                  onChange={(checked) => {
                    form.setValue(item.key, checked, { shouldDirty: true });
                  }}
                />
              ))}
            </div>
          </PreferenceCard>

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
                    checked={form.watch(item.key)}
                    label={item.label}
                    onChange={(checked) => {
                      form.setValue(item.key, checked, { shouldDirty: true });
                    }}
                  />
                </div>
              ))}
            </div>
          </PreferenceCard>

          <PreferenceCard
            description="Define your preferences for a better workflow"
            title="Timer page"
          >
            <div className="px-5 py-[15px]">
              <div className="w-full max-w-[500px]">
                {figmaTimerPreferences.map((item) => (
                  <CheckboxRow
                    checked={form.watch(item.key)}
                    key={item.key}
                    label={item.label}
                    onChange={(checked) => {
                      form.setValue(item.key, checked, { shouldDirty: true });
                    }}
                  />
                ))}
              </div>
            </div>
          </PreferenceCard>

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

          <PreferenceCard
            description="Choose how your times are shown across Toggl Track"
            title="Time and date"
          >
            <div className="flex flex-wrap gap-0 px-0 py-5">
              <div className="w-[240px] px-5">
                <PreferenceSelect
                  label="Duration Display Format"
                  onChange={(value) => {
                    form.setValue("durationFormat", value, { shouldDirty: true });
                  }}
                  options={durationFormatOptions}
                  value={form.watch("durationFormat")}
                />
                <PreferenceSelect
                  label="Time Format"
                  onChange={(value) => {
                    form.setValue("timeofdayFormat", value, { shouldDirty: true });
                  }}
                  options={timeFormatOptions}
                  value={form.watch("timeofdayFormat")}
                />
              </div>
              <div className="w-[240px] px-5">
                <PreferenceSelect
                  label="Date Format"
                  onChange={(value) => {
                    form.setValue("dateFormat", value, { shouldDirty: true });
                  }}
                  options={dateFormatOptions}
                  value={form.watch("dateFormat")}
                />
                <PreferenceNumberSelect
                  label="First day of the week"
                  onChange={(value) => {
                    form.setValue("beginningOfWeek", value, { shouldDirty: true });
                  }}
                  options={firstDayOfWeekOptions}
                  value={form.watch("beginningOfWeek")}
                />
              </div>
            </div>
          </PreferenceCard>

          <PreferenceCard title="Keyboard shortcuts">
            <div className="grid gap-0 px-0 py-[15px] md:grid-cols-[500px_minmax(0,1fr)]">
              <div className="px-5">
                <CheckboxRow
                  checked={form.watch(figmaShortcutPreferences[0].key)}
                  helper={figmaShortcutPreferences[0].helper}
                  label={figmaShortcutPreferences[0].label}
                  onChange={(checked) => {
                    form.setValue(figmaShortcutPreferences[0].key, checked, { shouldDirty: true });
                  }}
                />
              </div>
              <div className="px-5">
                {figmaShortcutPreferences.slice(1).map((item) => (
                  <CheckboxRow
                    checked={form.watch(item.key)}
                    key={item.key}
                    label={item.label}
                    onChange={(checked) => {
                      form.setValue(item.key, checked, { shouldDirty: true });
                    }}
                  />
                ))}
              </div>
            </div>
          </PreferenceCard>

          <ProfileBetaProgramCard />

          {apiTokenStatus ? (
            <AppInlineNotice
              className="border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-accent-text)]"
              tone="success"
            >
              {apiTokenStatus}
            </AppInlineNotice>
          ) : null}
          {apiTokenError ? (
            <AppInlineNotice className="border-rose-500/30 bg-[#23181b] text-rose-200" tone="error">
              {apiTokenError}
            </AppInlineNotice>
          ) : null}

          <PreferenceCard
            action={
              <ShellSecondaryButton
                disabled={resetApiTokenMutation.isPending}
                onClick={() => {
                  void resetApiTokenMutation
                    .mutateAsync()
                    .then(() => {
                      setApiTokenStatus("API token rotated");
                      setApiTokenError(null);
                    })
                    .catch(() => {
                      setApiTokenError("Could not rotate API token");
                      setApiTokenStatus(null);
                    });
                }}
                type="button"
              >
                {resetApiTokenMutation.isPending ? "Resetting..." : "Reset"}
              </ShellSecondaryButton>
            }
            description="This is a unique identifier used to authenticate you to Toggl Track. Keep your Token private to avoid sharing sensitive information."
            title="API Token"
          >
            <div className="px-[18px] py-[15px]">
              <input
                className="h-[37px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text-muted)]"
                readOnly
                value={profileQuery.data.api_token ?? ""}
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
        </div>
      </section>
      {toast ? <ShellToast {...toast} /> : null}
    </div>
  );
}

function formatReportsTimezone(timezone: string): string {
  return timezone === "Asia/Shanghai" ? "(UTC+08:00) Asia/Shanghai" : timezone;
}
