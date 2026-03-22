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

export function ProfilePage(): ReactElement {
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

  return (
    <div className="space-y-4" data-testid="profile-page">
      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="profile-overview">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Profile</h1>
            <p className="text-sm leading-6 text-slate-400">
              Account details, personal defaults, and API access stay on the user profile surface
              instead of being mixed into workspace administration.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SectionSummary
              description={profileQuery.data.email ?? "No email configured"}
              eyebrow="Account"
              metric={profileQuery.data.fullname ?? "Unnamed user"}
            />
            <SectionSummary
              description={`${preferenceFormValues.languageCode} · ${preferenceFormValues.dateFormat}`}
              eyebrow="Preferences"
              metric={preferenceFormValues.timezone}
            />
            <SectionSummary
              description={`Default workspace ${profileQuery.data.default_workspace_id ?? 0}`}
              eyebrow="Security"
              metric={profileQuery.data.api_token ? "API token active" : "No API token"}
            />
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

function SectionSummary({
  description,
  eyebrow,
  metric,
}: {
  description: string;
  eyebrow: string;
  metric: string;
}): ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-[#18181c] p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{eyebrow}</p>
      <p className="mt-2 text-base font-semibold text-white">{metric}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
