import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

import { PreferencesFormSection } from "../../features/profile/PreferencesFormSection.tsx";
import { ProfileFormSection } from "../../features/profile/ProfileFormSection.tsx";
import {
  createPreferencesFormValues,
  createProfileFormValues,
} from "../../shared/forms/profile-form.ts";
import {
  usePreferencesQuery,
  useProfileQuery,
  useUpdatePreferencesMutation,
  useUpdateProfileMutation,
} from "../../shared/query/web-shell.ts";

export function ProfilePage(): ReactElement {
  const profileQuery = useProfileQuery();
  const preferencesQuery = usePreferencesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
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
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Profile</h1>
          <p className="text-sm leading-6 text-slate-600">
            Manage account details and personal preferences on their dedicated page.
          </p>
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

function Notice({ children }: { children: string }): ReactElement {
  return (
    <AppPanel className="border-emerald-200 bg-emerald-50/80">
      <p className="text-sm font-semibold text-emerald-800">{children}</p>
    </AppPanel>
  );
}
