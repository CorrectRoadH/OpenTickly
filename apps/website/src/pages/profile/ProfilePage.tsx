import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

import { ApiTokenSection } from "../../features/profile/ApiTokenSection.tsx";
import { PreferencesFormSection } from "../../features/profile/PreferencesFormSection.tsx";
import { ProfileFormSection } from "../../features/profile/ProfileFormSection.tsx";
import {
  createPreferencesFormValues,
  createProfileFormValues,
} from "../../shared/forms/profile-form.ts";
import {
  usePreferencesQuery,
  useProfileQuery,
  useResetApiTokenMutation,
  useUpdatePreferencesMutation,
  useUpdateProfileMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";

export function ProfilePage(): ReactElement {
  const session = useSession();
  const profileQuery = useProfileQuery();
  const preferencesQuery = usePreferencesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const resetApiTokenMutation = useResetApiTokenMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const [apiTokenStatus, setApiTokenStatus] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(null);
  const [apiTokenError, setApiTokenError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

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

  const preferenceFormValues = createPreferencesFormValues(preferencesQuery.data);
  const profileName =
    profileQuery.data.fullname || session.user.fullName || profileQuery.data.email;
  const hasPassword = profileQuery.data.has_password ? "Enabled" : "Not enabled";
  const twoFactorStatus = profileQuery.data["2fa_enabled"] ? "Enabled" : "Not enabled";
  const identityRows = [
    {
      label: "Full name",
      value: profileName || "Unnamed user",
    },
    {
      label: "Email",
      value: profileQuery.data.email || "No email configured",
    },
    {
      label: "Reports timezone",
      value: preferencesQuery.data.pg_time_zone_name || profileQuery.data.timezone || "Not set",
    },
    {
      label: "Password sign-in",
      value: hasPassword,
    },
    {
      label: "2FA sign-in",
      value: twoFactorStatus,
    },
  ];

  return (
    <div className="space-y-4 pb-6" data-testid="profile-page">
      <section className="sticky top-0 z-10 border-b border-white/10 bg-[#161616]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b8b8b]">
              My Profile
            </p>
            <h1 className="text-[24px] font-semibold leading-none text-white">My Profile</h1>
          </div>
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-[#d0d0d0] transition hover:border-white/20 hover:text-white"
            disabled
            type="button"
          >
            Export account data
          </button>
        </div>
      </section>

      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="profile-overview">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex justify-center lg:w-[244px] lg:justify-start">
            <div className="rounded-[28px] border border-white/10 bg-[#18181c] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <UserAvatar
                className="size-[180px] border border-white/10 bg-[#d08a3c]"
                imageUrl={profileQuery.data.image_url ?? session.user.imageUrl}
                name={profileName || "Unnamed user"}
                textClassName="text-6xl font-semibold"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Personal details & preferences</h2>
              <p className="text-sm leading-6 text-slate-400">
                Change details, login methods and your password in Account settings.
              </p>
            </div>

            <dl className="space-y-3 border-y border-white/10 py-4">
              {identityRows.map((row) => (
                <div
                  className="grid gap-1 text-sm md:grid-cols-[130px_minmax(0,1fr)] md:gap-4"
                  key={row.label}
                >
                  <dt className="font-medium text-[#8b8b8b]">{row.label}</dt>
                  <dd className="text-white">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/10 bg-[#18181c] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-[#212126]"
                type="button"
              >
                Account settings
              </button>
              <div className="rounded-full border border-dashed border-white/10 px-4 py-2 text-sm text-slate-400">
                Avatar upload will wire up here once the backend avatar endpoint is implemented.
              </div>
            </div>
          </div>
        </div>
      </AppPanel>

      {profileStatus ? (
        <AppInlineNotice className="border-white/10 bg-[#18181c] text-[#dface3]" tone="success">
          {profileStatus}
        </AppInlineNotice>
      ) : null}
      {profileError ? (
        <AppInlineNotice className="border-rose-500/30 bg-[#23181b] text-rose-200" tone="error">
          {profileError}
        </AppInlineNotice>
      ) : null}
      <ProfileFormSection
        initialValues={createProfileFormValues(profileQuery.data)}
        onSubmit={async (request) => {
          try {
            await updateProfileMutation.mutateAsync(request);
            setProfileStatus("Profile saved");
            setProfileError(null);
          } catch {
            setProfileError("Could not save profile");
            setProfileStatus(null);
          }
        }}
      />

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
      <ApiTokenSection
        isRotating={resetApiTokenMutation.isPending}
        onRotate={async () => {
          try {
            await resetApiTokenMutation.mutateAsync();
            setApiTokenStatus("API token rotated");
            setApiTokenError(null);
          } catch {
            setApiTokenError("Could not rotate API token");
            setApiTokenStatus(null);
          }
        }}
        token={profileQuery.data.api_token ?? ""}
      />

      {preferencesStatus ? (
        <AppInlineNotice className="border-white/10 bg-[#18181c] text-[#dface3]" tone="success">
          {preferencesStatus}
        </AppInlineNotice>
      ) : null}
      {preferencesError ? (
        <AppInlineNotice className="border-rose-500/30 bg-[#23181b] text-rose-200" tone="error">
          {preferencesError}
        </AppInlineNotice>
      ) : null}
      <PreferencesFormSection
        initialValues={preferenceFormValues}
        onSubmit={async (request) => {
          try {
            await updatePreferencesMutation.mutateAsync(request);
            setPreferencesStatus("Preferences saved");
            setPreferencesError(null);
          } catch {
            setPreferencesError("Could not save preferences");
            setPreferencesStatus(null);
          }
        }}
      />
    </div>
  );
}
