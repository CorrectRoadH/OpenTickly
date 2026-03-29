import { AppButton, AppSurfaceState, PageHeader, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import {
  getCountries,
  getTimezones,
  postCloseAccount,
} from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useProfileQuery, useUpdateProfileMutation } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";
import { PreferenceCard, PreferenceSelect } from "../profile/ProfilePagePrimitives.tsx";

export function AccountPage(): ReactElement {
  const session = useSession();
  const profileQuery = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();

  if (profileQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Fetching account details."
          title="Loading account"
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
          description="We could not load account details right now. Refresh or try again shortly."
          title="Account unavailable"
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-4 pb-6" data-testid="account-page">
      <section className="sticky top-0 z-10 bg-[var(--track-surface)]">
        <PageHeader bordered title="Account Settings" />
      </section>

      <section className="flex gap-3 px-3 pb-10 pt-3">
        <div className="w-full max-w-[1352px] space-y-4">
          <PersonalDetailsSection
            avatarImageUrl={profile.image_url ?? session.user.imageUrl}
            email={profile.email ?? ""}
            fullname={profile.fullname ?? ""}
            onSave={(values) =>
              updateProfileMutation.mutateAsync(values).then(() => {
                toast.success("Personal details updated");
              })
            }
          />

          <TimezoneSection
            timezone={profile.timezone ?? "UTC"}
            onSave={(timezone) =>
              updateProfileMutation.mutateAsync({ timezone }).then(() => {
                toast.success("Timezone updated");
              })
            }
          />

          <CountrySection
            countryId={profile.country_id ?? 0}
            onSave={(country_id) =>
              updateProfileMutation.mutateAsync({ country_id }).then(() => {
                toast.success("Country updated");
              })
            }
          />

          <ChangePasswordSection
            hasPassword={session.user.hasPassword}
            onSave={(current_password, password) =>
              updateProfileMutation.mutateAsync({ current_password, password }).then(() => {
                toast.success("Password changed");
              })
            }
          />

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
  const [editName, setEditName] = useState(fullname);
  const [editEmail, setEditEmail] = useState(email);
  const [saving, setSaving] = useState(false);

  const hasChanges = editName !== fullname || editEmail !== email;

  return (
    <PreferenceCard
      description="These will be shown across all of your Organizations and the Toggl tools within them"
      title="Personal Details"
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
                .catch(() => toast.error("Failed to save personal details"))
                .finally(() => setSaving(false));
            }}
          >
            Save
          </AppButton>
        ) : undefined
      }
    >
      <div className="flex items-start gap-6 px-5 py-5">
        <UserAvatar
          className="size-[100px] shrink-0 rounded-full bg-[var(--track-surface)]"
          imageUrl={avatarImageUrl ?? undefined}
          name={fullname || "U"}
          textClassName="text-3xl font-semibold"
        />
        <div className="flex-1 space-y-4">
          <AccountField label="Full name">
            <input
              className="h-[39px] w-full max-w-[300px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </AccountField>
          <AccountField label="Email">
            <div className="flex items-center gap-3">
              <input
                className="h-[39px] w-full max-w-[300px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
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
    <PreferenceCard title="Time Preferences">
      <div className="px-5 py-5">
        <PreferenceSelect
          label="Timezone"
          onChange={(value) => {
            void onSave(value).catch(() => toast.error("Failed to update timezone"));
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
    <PreferenceCard title="Country">
      <div className="px-5 py-5">
        <PreferenceSelect
          label="Country"
          onChange={(value) => {
            void onSave(Number(value)).catch(() => toast.error("Failed to update country"));
          }}
          options={[{ label: "Not set", value: "0" }, ...options]}
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  if (!hasPassword) {
    return (
      <PreferenceCard title="Password Actions">
        <div className="px-5 py-5">
          <p className="text-[14px] text-[var(--track-text-muted)]">
            No password set. You signed up with a third-party provider.
          </p>
        </div>
      </PreferenceCard>
    );
  }

  return (
    <PreferenceCard title="Password Actions">
      <div className="px-5 py-5">
        {!open ? (
          <AppButton type="button" onClick={() => setOpen(true)}>
            Change Password
          </AppButton>
        ) : (
          <div className="max-w-[300px] space-y-4">
            <AccountField label="Current password">
              <input
                autoComplete="current-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                value={currentPassword}
              />
            </AccountField>
            <AccountField label="New password">
              <input
                autoComplete="new-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                value={newPassword}
              />
            </AccountField>
            <AccountField label="Confirm new password">
              <input
                autoComplete="new-password"
                className="h-[39px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[10px] text-[14px] font-medium text-[var(--track-text)] outline-none"
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                value={confirmPassword}
              />
            </AccountField>
            {newPassword.length > 0 && newPassword.length < 6 ? (
              <p className="text-[12px] text-red-400">Password must be at least 6 characters</p>
            ) : null}
            {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
              <p className="text-[12px] text-red-400">Passwords do not match</p>
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
                    .catch(() => toast.error("Failed to change password"))
                    .finally(() => setSaving(false));
                }}
              >
                Change Password
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
                Cancel
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </PreferenceCard>
  );
}

function AccountActionsSection({ organizationName }: { organizationName: string }): ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  return (
    <PreferenceCard
      description="Close your account or leave a workspace or organization associated with your account"
      title="Account Actions"
    >
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[var(--track-text)]">Organization</span>
          <span className="text-[14px] text-[var(--track-text-muted)]">{organizationName}</span>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--track-border)] pt-4">
          <span className="text-[14px] font-medium text-[var(--track-text)]">Toggl Account</span>
          {!confirming ? (
            <AppButton onClick={() => setConfirming(true)} danger type="button">
              Close Account
            </AppButton>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-red-400">Are you sure? This cannot be undone.</span>
              <AppButton
                disabled={closing}
                danger
                type="button"
                onClick={() => {
                  setClosing(true);
                  void unwrapWebApiResult(postCloseAccount())
                    .then(() => {
                      toast.success("Account closed");
                      globalThis.location.href = "/login";
                    })
                    .catch(() => {
                      toast.error("Failed to close account");
                      setClosing(false);
                      setConfirming(false);
                    });
                }}
              >
                Confirm Close
              </AppButton>
              <AppButton type="button" onClick={() => setConfirming(false)}>
                Cancel
              </AppButton>
            </div>
          )}
        </div>
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
