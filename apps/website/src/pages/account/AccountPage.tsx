import { AppButton, AppSurfaceState, PageHeader, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  getCountries,
  getTimezones,
  postCloseAccount,
} from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
  useProfileQuery,
  useUpdateProfileMutation,
  useResetOnboardingMutation,
} from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";
import { PreferenceCard, PreferenceSelect } from "../profile/ProfilePagePrimitives.tsx";
import i18n, {
  languageLabels,
  normalizeSupportedLanguage,
  supportedLanguages,
} from "../../app/i18n.ts";

export function AccountPage(): ReactElement {
  const session = useSession();
  const profileQuery = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const preferencesQuery = usePreferencesQuery();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const { t } = useTranslation();

  if (profileQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("account:fetchingAccountDetails")}
          title={t("account:loadingAccount")}
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent"
          description={t("account:couldNotLoadAccount")}
          title={t("account:accountUnavailable")}
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-4 pb-6" data-testid="account-page">
      <section className="sticky top-0 z-10 bg-[var(--track-surface)]">
        <PageHeader bordered title={t("account:accountSettings")} />
      </section>

      <section className="px-3 pb-10 pt-3 md:flex md:gap-3">
        <div className="w-full space-y-4 md:max-w-[1352px]">
          <PersonalDetailsSection
            avatarImageUrl={profile.image_url ?? session.user.imageUrl}
            email={profile.email ?? ""}
            fullname={profile.fullname ?? ""}
            onSave={(values) =>
              updateProfileMutation.mutateAsync(values).then(() => {
                toast.success(t("account:personalDetailsUpdated"));
              })
            }
          />

          <TimezoneSection
            timezone={profile.timezone ?? "UTC"}
            onSave={(timezone) =>
              updateProfileMutation.mutateAsync({ timezone }).then(() => {
                toast.success(t("account:timezoneUpdated"));
              })
            }
          />

          <CountrySection
            countryId={profile.country_id ?? 0}
            onSave={(country_id) =>
              updateProfileMutation.mutateAsync({ country_id }).then(() => {
                toast.success(t("account:countryUpdated"));
              })
            }
          />

          <LanguageSection
            languageCode={normalizeSupportedLanguage(
              preferencesQuery.data?.language_code ?? i18n.language,
            )}
            onSave={(languageCode) =>
              updatePreferencesMutation
                .mutateAsync({ language_code: languageCode })
                .then(() => {
                  void i18n.changeLanguage(languageCode);
                  toast.success(t("languageUpdated"));
                })
                .catch(() => toast.error(t("failedToUpdateLanguage")))
            }
          />

          <ChangePasswordSection
            hasPassword={session.user.hasPassword}
            onSave={(current_password, password) =>
              updateProfileMutation.mutateAsync({ current_password, password }).then(() => {
                toast.success(t("account:passwordChanged"));
              })
            }
          />

          <ResetOnboardingSection />

          <AccountActionsSection organizationName={session.currentOrganization?.name ?? ""} />
        </div>
      </section>
    </div>
  );
}

function PersonalDetailsSection({
  avatarImageUrl,
  email,
  fullname,
  onSave,
}: {
  avatarImageUrl?: string | null;
  email: string;
  fullname: string;
  onSave: (values: { fullname?: string; email?: string }) => Promise<void>;
}): ReactElement {
  const { t } = useTranslation("account");
  const [editName, setEditName] = useState(fullname);
  const [editEmail, setEditEmail] = useState(email);
  const [saving, setSaving] = useState(false);

  const hasChanges = editName !== fullname || editEmail !== email;

  return (
    <PreferenceCard
      description={t("personalDetailsDescription")}
      title={t("personalDetails")}
      action={
        hasChanges ? (
          <AppButton
            disabled={saving}
            type="button"
            onClick={() => {
              setSaving(true);
              const payload: { fullname?: string; email?: string } = {};
              if (editName !== fullname) payload.fullname = editName;
              if (editEmail !== email) payload.email = editEmail;
              void onSave(payload)
                .catch(() => toast.error(t("failedToSavePersonalDetails")))
                .finally(() => setSaving(false));
            }}
          >
            {t("save")}
          </AppButton>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center gap-4 px-5 py-5 md:flex-row md:items-start">
        <UserAvatar
          className="size-[80px] shrink-0 rounded-full bg-[var(--track-surface)] md:size-[100px]"
          imageUrl={avatarImageUrl ?? undefined}
          name={fullname || "U"}
          textClassName="text-2xl font-semibold md:text-3xl"
        />
        <div className="w-full space-y-4 md:flex-1">
          <AccountField label={t("fullName")}>
            <input
              className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none md:max-w-[300px]"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </AccountField>
          <AccountField label={t("emailLabel")}>
            <div className="flex items-center gap-3">
              <input
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none md:max-w-[300px]"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                type="email"
              />
            </div>
          </AccountField>
        </div>
      </div>
    </PreferenceCard>
  );
}

function TimezoneSection({
  onSave,
  timezone,
}: {
  onSave: (timezone: string) => Promise<void>;
  timezone: string;
}): ReactElement {
  const { t } = useTranslation("account");
  const timezonesQuery = useQuery({
    queryFn: () => unwrapWebApiResult(getTimezones()),
    queryKey: ["timezones"],
    staleTime: Infinity,
  });

  const options = (timezonesQuery.data ?? [timezone]).map((tz) => {
    const name = typeof tz === "string" ? tz : (tz as { name: string }).name;
    return { label: name, value: name };
  });

  return (
    <PreferenceCard title={t("timePreferences")}>
      <div className="px-5 py-5">
        <PreferenceSelect
          label={t("timezone")}
          onChange={(value) => {
            void onSave(value).catch(() => toast.error(t("failedToUpdateTimezone")));
          }}
          options={options}
          value={timezone}
        />
      </div>
    </PreferenceCard>
  );
}

function CountrySection({
  countryId,
  onSave,
}: {
  countryId: number;
  onSave: (countryId: number) => Promise<void>;
}): ReactElement {
  const { t } = useTranslation("account");
  const countriesQuery = useQuery({
    queryFn: () => unwrapWebApiResult(getCountries()),
    queryKey: ["countries"],
    staleTime: Infinity,
  });

  const options = (countriesQuery.data ?? []).map((c) => ({
    label: c.name ?? `Country ${c.id}`,
    value: String(c.id ?? 0),
  }));

  return (
    <PreferenceCard title={t("country")}>
      <div className="px-5 py-5">
        <PreferenceSelect
          label={t("country")}
          onChange={(value) => {
            void onSave(Number(value)).catch(() => toast.error(t("failedToUpdateCountry")));
          }}
          options={[{ label: t("notSet"), value: "0" }, ...options]}
          value={String(countryId)}
        />
      </div>
    </PreferenceCard>
  );
}

function ChangePasswordSection({
  hasPassword,
  onSave,
}: {
  hasPassword: boolean;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}): ReactElement {
  const { t } = useTranslation("account");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  if (!hasPassword) {
    return (
      <PreferenceCard title={t("passwordActions")}>
        <div className="px-5 py-5">
          <p className="text-[14px] text-[var(--track-text-muted)]">{t("noPasswordSet")}</p>
        </div>
      </PreferenceCard>
    );
  }

  return (
    <PreferenceCard title={t("passwordActions")}>
      <div className="px-5 py-5">
        {!open ? (
          <AppButton type="button" onClick={() => setOpen(true)}>
            {t("changePassword")}
          </AppButton>
        ) : (
          <div className="space-y-4 md:max-w-[300px]">
            <AccountField label={t("currentPassword")}>
              <input
                autoComplete="current-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                value={currentPassword}
              />
            </AccountField>
            <AccountField label={t("newPassword")}>
              <input
                autoComplete="new-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                value={newPassword}
              />
            </AccountField>
            <AccountField label={t("confirmNewPassword")}>
              <input
                autoComplete="new-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                value={confirmPassword}
              />
            </AccountField>
            {newPassword.length > 0 && newPassword.length < 6 ? (
              <p className="text-[12px] text-red-400">{t("passwordMinLength")}</p>
            ) : null}
            {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
              <p className="text-[12px] text-red-400">{t("passwordsDoNotMatch")}</p>
            ) : null}
            <div className="flex items-center gap-3 pt-2">
              <AppButton
                disabled={!canSubmit || saving}
                type="button"
                onClick={() => {
                  setSaving(true);
                  void onSave(currentPassword, newPassword)
                    .then(() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setOpen(false);
                    })
                    .catch(() => toast.error(t("failedToChangePassword")))
                    .finally(() => setSaving(false));
                }}
              >
                {t("changePassword")}
              </AppButton>
              <AppButton
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                {t("cancel")}
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </PreferenceCard>
  );
}

function ResetOnboardingSection(): ReactElement {
  const { t } = useTranslation("account");
  const resetOnboardingMutation = useResetOnboardingMutation();

  return (
    <PreferenceCard description={t("resetOnboardingDescription")} title={t("resetOnboarding")}>
      <div className="px-5 py-5">
        <AppButton
          disabled={resetOnboardingMutation.isPending}
          type="button"
          onClick={() => {
            resetOnboardingMutation.mutate(undefined, {
              onSuccess: () => {
                toast.success(t("onboardingReset"));
                globalThis.location.reload();
              },
              onError: () => {
                toast.error(t("failedToResetOnboarding"));
              },
            });
          }}
        >
          {t("resetOnboarding")}
        </AppButton>
      </div>
    </PreferenceCard>
  );
}

function AccountActionsSection({ organizationName }: { organizationName: string }): ReactElement {
  const { t } = useTranslation("account");
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  return (
    <PreferenceCard description={t("accountActionsDescription")} title={t("accountActions")}>
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[var(--track-text)]">
            {t("organization")}
          </span>
          <span className="text-[14px] text-[var(--track-text-muted)]">{organizationName}</span>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--track-border)] pt-4">
          <span className="text-[14px] font-medium text-[var(--track-text)]">
            {t("togglAccount")}
          </span>
          {!confirming ? (
            <AppButton onClick={() => setConfirming(true)} danger type="button">
              {t("closeAccount")}
            </AppButton>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-red-400">{t("areYouSureCannotUndo")}</span>
              <AppButton
                disabled={closing}
                danger
                type="button"
                onClick={() => {
                  setClosing(true);
                  void unwrapWebApiResult(postCloseAccount())
                    .then(() => {
                      toast.success(t("accountClosed"));
                      globalThis.location.href = "/login";
                    })
                    .catch(() => {
                      toast.error(t("failedToCloseAccount"));
                      setClosing(false);
                      setConfirming(false);
                    });
                }}
              >
                {t("confirmClose")}
              </AppButton>
              <AppButton type="button" onClick={() => setConfirming(false)}>
                {t("cancel")}
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </PreferenceCard>
  );
}

function LanguageSection({
  languageCode,
  onSave,
}: {
  languageCode: string;
  onSave: (languageCode: string) => void;
}): ReactElement {
  const { t } = useTranslation("account");
  const options = supportedLanguages.map((code) => ({
    label: languageLabels[code],
    value: code,
  }));

  return (
    <PreferenceCard title={t("language")}>
      <div className="px-5 py-5">
        <PreferenceSelect
          label={t("language")}
          onChange={onSave}
          options={options}
          value={languageCode}
        />
      </div>
    </PreferenceCard>
  );
}

function AccountField({
  children,
  label,
}: {
  children: ReactElement;
  label: string;
}): ReactElement {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[var(--track-text-soft)]">
        {label}
      </label>
      <div className="mt-[10px]">{children}</div>
    </div>
  );
}
