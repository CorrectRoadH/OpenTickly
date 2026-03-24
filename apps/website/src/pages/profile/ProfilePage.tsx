import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
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
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";

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

const sectionCardClassName =
  "overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]";
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
          <AppPanel className="border-none bg-transparent p-0 shadow-none">
            <div className="flex min-h-[331px] items-start">
              <div className="flex h-[331px] w-[268px] items-start p-6">
                <div className="flex size-[220px] items-start rounded-[110px] border border-[var(--track-border)] bg-[var(--track-surface)]">
                  <div className="flex h-full items-center justify-center py-[2px]">
                    <UserAvatar
                      className="size-[216px] rounded-[108px] bg-[var(--track-surface)]"
                      imageUrl={profileQuery.data.image_url ?? session.user.imageUrl}
                      name={profileName || "Unnamed user"}
                      textClassName="text-6xl font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex min-h-[331px] min-w-0 flex-1 flex-col pl-3">
                <div className="border-b border-[var(--track-border)] pb-3">
                  <h2 className="text-[14px] font-semibold leading-[22.96px] text-white">
                    Personal details & preferences
                  </h2>
                  <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-muted)]">
                    Change details, login methods and your password in Account settings.
                  </p>
                </div>

                <dl className="space-y-0 py-5">
                  {heroRows.map((row) => (
                    <div className="flex items-center py-1" key={row.label}>
                      <dt className="min-w-[130px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                        {row.label}
                      </dt>
                      <dd className="text-[14px] font-medium leading-5 text-white">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <a
                    className="inline-flex h-9 items-center rounded-[8px] border border-[var(--track-border)] px-[25px] py-[9px] text-[14px] font-semibold leading-5 text-[var(--track-text-muted)]"
                    href="https://track.toggl.com/account"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Account settings
                  </a>
                </div>
              </div>
            </div>
          </AppPanel>

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

          <section className="overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-black shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.24),inset_0_-1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-center gap-10 px-10 py-4">
              <div className="flex h-[240px] w-[340px] items-center justify-center">
                <div className="relative size-[240px]">
                  <div className="absolute left-[14px] top-[59px] h-[118px] w-[122px] rounded-[60px] bg-[#c0b8c3]" />
                  <div className="absolute left-[80px] top-[14px] h-[76px] w-[92px] rounded-t-[50px] border-[16px] border-b-0 border-[#564260]" />
                  <div className="absolute left-[79px] top-[123px] h-[78px] w-[102px] rounded-[8px] bg-[#ffde91]" />
                  <div className="absolute left-[113px] top-[144px] h-[37px] w-[35px] rounded-[18px] bg-[#2c1338]" />
                  <div className="absolute left-[66px] top-[120px] h-[82px] w-[116px] rounded-[8px] border border-[#f8cd76]" />
                  <div className="absolute left-[44px] top-[131px] size-[13px] rounded-full bg-[#2c1338]" />
                </div>
              </div>

              <div className="max-w-[443px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[31px] pb-[21px] pt-[30.5px]">
                <h3 className="text-[14px] font-semibold leading-[22.96px] text-white">
                  You&apos;re a Beta Tester
                </h3>
                <p className="mt-[17.5px] max-w-[352px] text-[14px] font-medium leading-[21px] text-[var(--track-text)]">
                  You get early versions of our new releases before anyone else. New features are
                  indicated with{" "}
                  <span className="rounded-[8px] bg-[var(--track-text)] px-[6px] py-[4px] text-[12px] font-semibold uppercase leading-3 text-black">
                    Beta
                  </span>{" "}
                  symbol.
                </p>
                <div className="mt-[17.5px] flex items-center gap-7 pt-[14.5px]">
                  <ShellSecondaryButton disabled type="button">
                    Disable beta features
                  </ShellSecondaryButton>
                  <a
                    className="text-[14px] font-medium leading-[14px] text-[var(--track-accent-text)]"
                    href="https://support.toggl.com/en/articles/2220661-your-toggl-track-account#beta-tester-program"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Learn more
                  </a>
                </div>
              </div>
            </div>
          </section>

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

function PreferenceCard({
  action,
  children,
  description,
  title,
}: {
  action?: ReactElement;
  children: ReactElement;
  description?: string;
  title: string;
}): ReactElement {
  return (
    <section className={sectionCardClassName}>
      <div className="flex items-center justify-between border-b border-[var(--track-border)] px-5 py-[18px]">
        <div>
          <h2 className="text-[14px] font-semibold leading-[22.96px] text-white">{title}</h2>
          {description ? (
            <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

function CheckboxRow({
  checked,
  className = "",
  helper,
  label,
  onChange,
}: {
  checked: boolean;
  className?: string;
  helper?: string;
  label: string;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <label className={`flex cursor-pointer items-start px-0 py-[5px] ${className}`.trim()}>
      <span className="relative mt-[3px] mr-[10px] flex size-[14px] shrink-0 items-center justify-center">
        <input
          checked={checked}
          className="peer absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            onChange(event.target.checked);
          }}
          type="checkbox"
        />
        <span className="flex size-[14px] items-center justify-center rounded-[4px] border border-[var(--track-border)] bg-[var(--track-surface)] peer-checked:border-[var(--track-accent)] peer-checked:bg-[var(--track-accent)]">
          {checked ? (
            <span className="text-[10px] font-semibold leading-none text-black">✓</span>
          ) : null}
        </span>
      </span>
      <span>
        <span className="block text-[14px] font-medium leading-[normal] text-[var(--track-text)]">
          {label}
        </span>
        {helper ? (
          <span className="block pt-[3.54px] text-[12px] leading-4 text-[var(--track-text-muted)]">
            {helper}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function PreferenceSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}): ReactElement {
  return (
    <div className="pb-[10px]">
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[var(--track-text-soft)]">
        {label}
      </label>
      <div className="relative mt-[10px] h-[39px] w-[200px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <select
          className="h-full w-full appearance-none rounded-[8px] bg-transparent px-[10px] text-[14px] font-medium leading-none text-[var(--track-text-muted)] outline-none"
          onChange={(event) => {
            onChange(event.target.value);
          }}
          value={value}
        >
          {options.map((option) => (
            <option
              className="bg-[var(--track-surface)] text-[var(--track-text-muted)]"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-[14px] text-[10px] text-[var(--track-text-muted)]">
          ▾
        </span>
      </div>
    </div>
  );
}

function PreferenceNumberSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  options: ReadonlyArray<{ label: string; value: number }>;
  value: number;
}): ReactElement {
  return (
    <div className="pb-[10px]">
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[var(--track-text-soft)]">
        {label}
      </label>
      <div className="relative mt-[10px] h-[39px] w-[200px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <select
          className="h-full w-full appearance-none rounded-[8px] bg-transparent px-[10px] text-[14px] font-medium leading-none text-[var(--track-text-muted)] outline-none"
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
          value={String(value)}
        >
          {options.map((option) => (
            <option
              className="bg-[var(--track-surface)] text-[var(--track-text-muted)]"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-[14px] text-[10px] text-[var(--track-text-muted)]">
          ▾
        </span>
      </div>
    </div>
  );
}

function IntegrationTile({ accent, title }: { accent: string; title: string }): ReactElement {
  return (
    <div className="flex h-[70px] w-[300px] items-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4">
      <div
        className="flex size-6 items-center justify-center rounded-[4px]"
        style={{ backgroundColor: accent }}
      >
        <span className="text-[10px] font-bold text-black">■</span>
      </div>
      <div className="ml-3">
        <p className="text-[11px] font-semibold uppercase leading-3 text-white">{title}</p>
        <p className="text-[12px] font-medium leading-4 text-[#4ca4ff]">Connect</p>
      </div>
    </div>
  );
}

function formatReportsTimezone(timezone: string): string {
  return timezone === "Asia/Shanghai" ? "(UTC+08:00) Asia/Shanghai" : timezone;
}
