import {
  AppSurfaceState,
  ShellPageHeader,
  ShellSecondaryButton,
  ShellSurfaceCard,
  ShellToast,
} from "@opentoggl/web-ui";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
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
import { defaultPreferencesFormValues } from "./ProfilePageData.ts";
import { ProfileBetaProgramCard, ProfileHeroCard } from "./ProfilePagePrimitives.tsx";
import {
  ApiTokenSection,
  ApiTokenStatusNotices,
  EmailPreferencesSection,
  ExternalCalendarsSection,
  InAppNotificationsSection,
  KeyboardShortcutsSection,
  SingleSignOnSection,
  TimeAndDateSection,
  TimerPageSection,
} from "./ProfilePageSections.tsx";

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
  const preferenceData = preferencesQuery.data;
  const preferenceValues = useMemo(
    () => createPreferencesFormValues(preferenceData ?? {}),
    [preferenceData],
  );

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
          className="border-none bg-transparent"
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
  const readPreference = <K extends keyof PreferencesFormValues>(
    key: K,
  ): PreferencesFormValues[K] => form.watch(key);
  const writePreference = <K extends keyof PreferencesFormValues>(
    key: K,
    value: PreferencesFormValues[K],
  ): void => {
    form.setValue(
      key as Parameters<typeof form.setValue>[0],
      value as Parameters<typeof form.setValue>[1],
      { shouldDirty: true },
    );
  };

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

          <EmailPreferencesSection getValue={readPreference} setValue={writePreference} />
          <InAppNotificationsSection getValue={readPreference} setValue={writePreference} />
          <TimerPageSection getValue={readPreference} setValue={writePreference} />
          <ExternalCalendarsSection />
          <SingleSignOnSection />
          <TimeAndDateSection getValue={readPreference} setValue={writePreference} />
          <KeyboardShortcutsSection getValue={readPreference} setValue={writePreference} />

          <ProfileBetaProgramCard />

          <ApiTokenStatusNotices apiTokenError={apiTokenError} apiTokenStatus={apiTokenStatus} />
          <ApiTokenSection
            apiToken={profileQuery.data.api_token ?? ""}
            isResetPending={resetApiTokenMutation.isPending}
            onReset={() => {
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
          />
        </div>
      </section>
      {toast ? <ShellToast {...toast} /> : null}
    </div>
  );
}

function formatReportsTimezone(timezone: string): string {
  return timezone === "Asia/Shanghai" ? "(UTC+08:00) Asia/Shanghai" : timezone;
}
