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
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="Fetching current user account details and preferences."
          title="Loading profile"
          tone="loading"
        />
      </AppPanel>
    );
  }

  if (profileQuery.isError || preferencesQuery.isError) {
    return (
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="We could not load account details right now. Refresh or try again shortly."
          title="Profile unavailable"
          tone="error"
        />
      </AppPanel>
    );
  }

  if (!profileQuery.data || !preferencesQuery.data) {
    return (
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="No profile data was returned for this session."
          title="Profile data unavailable"
          tone="empty"
        />
      </AppPanel>
    );
  }

  return (
    <div className="space-y-4">
      <AppPanel className="bg-white/95">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Profile</h1>
          <div className="grid gap-3 sm:grid-cols-3">
            <SectionSummary
              description="Current user details used across the account and session surfaces."
              title="Account"
            />
            <SectionSummary
              description="Personal defaults that shape how time, dates, and notifications appear."
              title="Preferences"
            />
            <SectionSummary
              description="API token access for account-level integrations and basic auth compatibility."
              title="Security"
            />
          </div>
        </div>
      </AppPanel>

      {profileStatus ? <AppInlineNotice tone="success">{profileStatus}</AppInlineNotice> : null}
      {profileError ? <AppInlineNotice tone="error">{profileError}</AppInlineNotice> : null}
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

      {apiTokenStatus ? <AppInlineNotice tone="success">{apiTokenStatus}</AppInlineNotice> : null}
      {apiTokenError ? <AppInlineNotice tone="error">{apiTokenError}</AppInlineNotice> : null}
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
        token={profileQuery.data.api_token}
      />

      {preferencesStatus ? (
        <AppInlineNotice tone="success">{preferencesStatus}</AppInlineNotice>
      ) : null}
      {preferencesError ? (
        <AppInlineNotice tone="error">{preferencesError}</AppInlineNotice>
      ) : null}
      <PreferencesFormSection
        initialValues={createPreferencesFormValues(preferencesQuery.data)}
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
  title,
}: {
  description: string;
  title: string;
}): ReactElement {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
