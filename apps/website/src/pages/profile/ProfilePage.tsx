import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

import {
  useResetApiTokenMutation,
  usePreferencesQuery,
  useProfileQuery,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";

const figmaEmailPreferences = [
  {
    checked: false,
    key: "send_product_emails",
    label: "Toggl Track can send newsletters by email",
  },
  {
    checked: false,
    key: "send_weekly_report",
    label: "Weekly overview of tracked time",
  },
  {
    checked: true,
    key: "send_timer_notifications",
    label: "Email about long running (over 8 hours) time entries",
  },
  {
    checked: true,
    key: "send_daily_project_invites",
    label: "Notify me when I'm added to a new project",
  },
] as const;

const figmaInAppPreferences = [
  {
    checked: true,
    key: "send_added_to_project_notification",
    label: "Notify me when I am added to projects and tasks",
    section: "Projects",
  },
  {
    checked: true,
    key: "send_product_release_notification",
    label: "Notify me when a new feature is released",
    section: "Product releases",
  },
] as const;

const figmaTimerPreferences = [
  {
    checked: true,
    key: "collapseTimeEntries",
    label: "Group similar time entries",
  },
  {
    checked: true,
    key: "showTimeInTitle",
    label: "Show running time in the title bar",
  },
  {
    checked: true,
    key: "animation_opt_out",
    label: "Show animations",
  },
  {
    checked: true,
    key: "is_goals_view_shown",
    label: "Show goals view",
  },
] as const;

const figmaShortcutPreferences = [
  {
    checked: true,
    helper: 'Press question mark "?" to see available keyboard shortcuts',
    key: "keyboard_shortcuts_enabled",
    label: "Allow using keyboard shortcuts",
  },
  {
    checked: false,
    key: "project_shortcut_enabled",
    label: "Allow using @ shortcut to assign a Project in the Timer Description field",
  },
  {
    checked: false,
    key: "tags_shortcut_enabled",
    label: "Allow using # shortcut to assign a Tag in the Timer Description field",
  },
] as const;

const timeAndDateOptions = {
  dateFormat: ["YYYY-MM-DD"],
  durationFormat: ["Improved (0:47:06)"],
  firstDayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  timeFormat: ["24-hour", "12-hour"],
} as const;

const sectionCardClassName = "overflow-hidden rounded-[8px] border border-[#3a3a3a] bg-[#1b1b1b]";

export function ProfilePage(): ReactElement {
  const session = useSession();
  const profileQuery = useProfileQuery();
  const preferencesQuery = usePreferencesQuery();
  const resetApiTokenMutation = useResetApiTokenMutation();
  const [apiTokenStatus, setApiTokenStatus] = useState<string | null>(null);
  const [apiTokenError, setApiTokenError] = useState<string | null>(null);

  if (profileQuery.isPending || preferencesQuery.isPending) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-white/10 bg-[#18181c] text-slate-300"
          description="Fetching current user account details and preferences."
          title="Loading profile"
          tone="loading"
        />
      </AppPanel>
    );
  }

  if (profileQuery.isError || preferencesQuery.isError) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-rose-500/30 bg-[#23181b] text-rose-200"
          description="We could not load account details right now. Refresh or try again shortly."
          title="Profile unavailable"
          tone="error"
        />
      </AppPanel>
    );
  }

  if (!profileQuery.data || !preferencesQuery.data) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-white/10 bg-[#18181c] text-slate-300"
          description="No profile data was returned for this session."
          title="Profile data unavailable"
          tone="empty"
        />
      </AppPanel>
    );
  }

  const preferencesRecord = preferencesQuery.data as Record<string, unknown>;
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
      <section className="sticky top-0 z-10 border-b border-[#3a3a3a] bg-[#1b1b1b]">
        <div className="flex items-center justify-between px-5 py-[18px]">
          <h1 className="text-[21px] font-semibold leading-[30px] text-[#fafafa]">My Profile</h1>
          <button
            className="rounded-[8px] border border-[#666666] px-4 py-2 text-[12px] font-semibold text-[#e5e5e5]"
            disabled
            type="button"
          >
            Export account data
          </button>
        </div>
      </section>

      <section className="flex gap-3 px-3 pb-10 pt-3">
        <div className="w-full max-w-[1352px] space-y-4">
          <AppPanel className="border-none bg-transparent p-0 shadow-none">
            <div className="flex min-h-[331px] items-start">
              <div className="flex h-[331px] w-[268px] items-start p-6">
                <div className="flex size-[220px] items-start rounded-[110px] border border-[#3a3a3a] bg-[#1b1b1b]">
                  <div className="flex h-full items-center justify-center py-[2px]">
                    <UserAvatar
                      className="size-[216px] rounded-[108px] bg-[#1b1b1b]"
                      imageUrl={profileQuery.data.image_url ?? session.user.imageUrl}
                      name={profileName || "Unnamed user"}
                      textClassName="text-6xl font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex min-h-[331px] min-w-0 flex-1 flex-col pl-3">
                <div className="border-b border-[#3a3a3a] pb-3">
                  <h2 className="text-[14px] font-semibold leading-[22.96px] text-[#fafafa]">
                    Personal details & preferences
                  </h2>
                  <p className="text-[14px] font-medium leading-[21.98px] text-[#999999]">
                    Change details, login methods and your password in Account settings.
                  </p>
                </div>

                <dl className="space-y-0 py-5">
                  {heroRows.map((row) => (
                    <div className="flex items-center py-1" key={row.label}>
                      <dt className="min-w-[130px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[#999999]">
                        {row.label}
                      </dt>
                      <dd className="text-[14px] font-medium leading-5 text-[#fafafa]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <a
                    className="inline-flex items-center rounded-[8px] border border-[#666666] px-[25px] py-[9px] text-[14px] font-semibold leading-5 text-[#e5e5e5]"
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
                  checked={preferenceBoolean(preferencesRecord, item.key, item.checked)}
                  key={item.key}
                  label={item.label}
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
                  <p className="mb-0 text-[11px] font-semibold uppercase leading-4 text-[#a4a4a4]">
                    {item.section}
                  </p>
                  <CheckboxRow
                    checked={preferenceBoolean(preferencesRecord, item.key, item.checked)}
                    className="px-0"
                    label={item.label}
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
                    checked={preferenceBoolean(preferencesRecord, item.key, item.checked)}
                    key={item.key}
                    label={item.label}
                  />
                ))}
              </div>
            </div>
          </PreferenceCard>

          <PreferenceCard
            action={
              <button
                className="rounded-[8px] border border-[#666666] px-4 py-2 text-[12px] font-semibold text-[#e5e5e5]"
                disabled
                type="button"
              >
                Go to calendar
              </button>
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
              <button
                className="rounded-[8px] border border-[#666666] px-4 py-2 text-[12px] font-semibold text-[#e5e5e5]"
                disabled
                type="button"
              >
                Create SSO profile
              </button>
            </div>
          </PreferenceCard>

          <PreferenceCard
            description="Choose how your times are shown across Toggl Track"
            title="Time and date"
          >
            <div className="flex flex-wrap gap-0 px-0 py-5">
              <div className="w-[240px] px-5">
                <FakeSelect
                  label="Duration Display Format"
                  value={timeAndDateOptions.durationFormat[0]}
                />
                <FakeSelect
                  label="Time Format"
                  value={resolveTimeFormat(
                    String(preferencesQuery.data.timeofday_format ?? "h:mm a"),
                  )}
                />
              </div>
              <div className="w-[240px] px-5">
                <FakeSelect
                  label="Date Format"
                  value={String(
                    preferencesQuery.data.date_format ?? timeAndDateOptions.dateFormat[0],
                  )}
                />
                <FakeSelect
                  label="First day of the week"
                  value={resolveBeginningOfWeek(Number(preferencesQuery.data.beginningOfWeek ?? 1))}
                />
              </div>
            </div>
          </PreferenceCard>

          <PreferenceCard title="Keyboard shortcuts">
            <div className="grid gap-0 px-0 py-[15px] md:grid-cols-[500px_minmax(0,1fr)]">
              <div className="px-5">
                <CheckboxRow
                  checked={preferenceBoolean(
                    preferencesRecord,
                    figmaShortcutPreferences[0].key,
                    figmaShortcutPreferences[0].checked,
                  )}
                  helper={figmaShortcutPreferences[0].helper}
                  label={figmaShortcutPreferences[0].label}
                />
              </div>
              <div className="px-5">
                {figmaShortcutPreferences.slice(1).map((item) => (
                  <CheckboxRow
                    checked={preferenceBoolean(preferencesRecord, item.key, item.checked)}
                    key={item.key}
                    label={item.label}
                  />
                ))}
              </div>
            </div>
          </PreferenceCard>

          <section className="overflow-hidden rounded-[8px] bg-black shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.24),inset_0_-1px_0_0_rgba(255,255,255,0.02)]">
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

              <div className="max-w-[443px] rounded-[8px] border border-[#555555] bg-[#1b1b1b] px-[31px] pb-[21px] pt-[30.5px]">
                <h3 className="text-[14px] font-semibold leading-[22.96px] text-[#fafafa]">
                  You&apos;re a Beta Tester
                </h3>
                <p className="mt-[17.5px] max-w-[352px] text-[14px] font-medium leading-[21px] text-[#b2b2b2]">
                  You get early versions of our new releases before anyone else. New features are
                  indicated with{" "}
                  <span className="rounded-[8px] bg-[#b2b2b2] px-[6px] py-[4px] text-[12px] font-semibold uppercase leading-3 text-[#121212]">
                    Beta
                  </span>{" "}
                  symbol.
                </p>
                <div className="mt-[17.5px] flex items-center gap-7 pt-[14.5px]">
                  <button
                    className="rounded-[8px] border border-[#555555] px-[17px] py-[7px] text-[14px] font-semibold text-white"
                    disabled
                    type="button"
                  >
                    Disable beta features
                  </button>
                  <a
                    className="text-[14px] font-medium leading-[14px] text-[#f7d0f0]"
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
            <AppInlineNotice className="border-white/10 bg-[#18181c] text-[#dface3]" tone="success">
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
              <button
                className="rounded-[8px] border border-[#555555] px-[17px] py-[7px] text-[14px] font-semibold text-white"
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
              </button>
            }
            description="This is a unique identifier used to authenticate you to Toggl Track. Keep your Token private to avoid sharing sensitive information."
            title="API Token"
          >
            <div className="px-[18px] py-[15px]">
              <input
                className="h-[37px] w-full rounded-[8px] border border-[#666666] bg-[#1b1b1b] px-[10px] text-[14px] font-medium text-[#999999]"
                readOnly
                value={profileQuery.data.api_token ?? ""}
              />
              <div className="mt-4 space-y-1 text-[14px] font-medium leading-5 text-[#b2b2b2]">
                <p>You&apos;ve used 0 / 30 requests in personal company (Free)</p>
                <p>You&apos;ve used 0 / 30 requests from user specific requests quota</p>
                <p className="pt-3 text-[12px] leading-4 text-[#999999]">
                  Learn more about API limits, or upgrade your plan for increased access.
                </p>
              </div>
            </div>
          </PreferenceCard>
        </div>
      </section>
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
      <div className="flex items-center justify-between border-b border-[#3a3a3a] px-5 py-[18px]">
        <div>
          <h2 className="text-[14px] font-semibold leading-[22.96px] text-[#fafafa]">{title}</h2>
          {description ? (
            <p className="text-[14px] font-medium leading-[21.98px] text-[#999999]">
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
}: {
  checked: boolean;
  className?: string;
  helper?: string;
  label: string;
}): ReactElement {
  return (
    <div className={`flex items-start px-0 py-[5px] ${className}`.trim()}>
      <span
        className={`mt-[3px] mr-[10px] flex size-[14px] shrink-0 items-center justify-center rounded-[4px] border ${
          checked ? "border-[#cd7fc2] bg-[#cd7fc2]" : "border-[#666666] bg-[#1b1b1b]"
        }`}
      >
        {checked ? (
          <span className="text-[10px] font-semibold leading-none text-black">✓</span>
        ) : null}
      </span>
      <span>
        <span className="block text-[14px] font-medium leading-[normal] text-[#b2b2b2]">
          {label}
        </span>
        {helper ? (
          <span className="block pt-[3.54px] text-[12px] leading-4 text-[#999999]">{helper}</span>
        ) : null}
      </span>
    </div>
  );
}

function FakeSelect({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="pb-[10px]">
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[#a4a4a4]">
        {label}
      </label>
      <div className="relative mt-[10px] h-[39px] w-[200px] rounded-[8px] border border-[#666666] bg-[#1b1b1b] p-px">
        <div className="h-full px-[10px] py-[10px] text-[14px] font-medium leading-none text-[#999999]">
          {value}
        </div>
        <span className="absolute right-3 top-[14px] text-[10px] text-[#999999]">▾</span>
      </div>
    </div>
  );
}

function IntegrationTile({ accent, title }: { accent: string; title: string }): ReactElement {
  return (
    <div className="flex h-[70px] w-[300px] items-center rounded-[2px] border border-[#3a3a3a] bg-[#1b1b1b] px-4">
      <div
        className="flex size-6 items-center justify-center rounded-[4px]"
        style={{ backgroundColor: accent }}
      >
        <span className="text-[10px] font-bold text-black">■</span>
      </div>
      <div className="ml-3">
        <p className="text-[11px] font-semibold uppercase leading-3 text-[#fafafa]">{title}</p>
        <p className="text-[12px] font-medium leading-4 text-[#4ca4ff]">Connect</p>
      </div>
    </div>
  );
}

function preferenceBoolean(
  preferences: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  return typeof preferences[key] === "boolean" ? (preferences[key] as boolean) : fallback;
}

function resolveBeginningOfWeek(value: number): string {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return labels[value] ?? "Monday";
}

function resolveTimeFormat(value: string): string {
  return value === "H:mm" || value === "HH:mm" ? "24-hour" : "24-hour";
}

function formatReportsTimezone(timezone: string): string {
  return timezone === "Asia/Shanghai" ? "(UTC+08:00) Asia/Shanghai" : timezone;
}
