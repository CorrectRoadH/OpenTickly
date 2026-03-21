import { AppPanel } from "@opentoggl/web-ui";
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

  if (profileQuery.isPending || preferencesQuery.isPending) {
    return <LoadingPanel message="Loading profile…" />;
  }

  if (!profileQuery.data || !preferencesQuery.data) {
    return <LoadingPanel message="Profile data unavailable." />;
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

      {profileStatus ? <Notice>{profileStatus}</Notice> : null}
      <ProfileFormSection
        initialValues={createProfileFormValues(profileQuery.data)}
        onSubmit={async (request) => {
          await updateProfileMutation.mutateAsync(request);
          setProfileStatus("Profile saved");
        }}
      />

      {apiTokenStatus ? <Notice>{apiTokenStatus}</Notice> : null}
      <ApiTokenSection
        isRotating={resetApiTokenMutation.isPending}
        onRotate={async () => {
          await resetApiTokenMutation.mutateAsync();
          setApiTokenStatus("API token rotated");
        }}
        token={profileQuery.data.api_token}
      />

      {preferencesStatus ? <Notice>{preferencesStatus}</Notice> : null}
      <PreferencesFormSection
        initialValues={createPreferencesFormValues(preferencesQuery.data)}
        onSubmit={async (request) => {
          await updatePreferencesMutation.mutateAsync(request);
          setPreferencesStatus("Preferences saved");
        }}
      />
    </div>
  );
}

function LoadingPanel({ message }: { message: string }): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </AppPanel>
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

function Notice({ children }: { children: string }): ReactElement {
  return (
    <AppPanel className="border-emerald-200 bg-emerald-50/80">
      <p className="text-sm font-semibold text-emerald-800">{children}</p>
    </AppPanel>
  );
}
