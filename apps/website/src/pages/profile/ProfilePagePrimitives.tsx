import { Upload, Trash2 } from "lucide-react";
import { type ReactElement, type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AppCheckbox, AppPanel, SelectDropdown } from "@opentoggl/web-ui";

import { deleteAvatars, client } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult, WebApiError } from "../../shared/api/web-client.ts";
import type { PostAvatarsResponses } from "../../shared/api/generated/public-track/types.gen.ts";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";

const sectionCardClassName =
  "overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]";

export function PreferenceCard({
  action,
  children,
  description,
  id,
  title,
}: {
  action?: ReactElement;
  children: ReactNode;
  description?: string;
  id?: string;
  title: string;
}): ReactElement {
  return (
    <section className={sectionCardClassName} id={id}>
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

export function CheckboxRow({
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
      <AppCheckbox
        checked={checked}
        className="mt-[3px] mr-[10px]"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
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

export function PreferenceSelect({
  label,
  onChange,
  options,
  testId,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  testId?: string;
  value: string;
}): ReactElement {
  return (
    <PreferenceSelectBase
      label={label}
      onChange={onChange}
      options={options}
      testId={testId}
      value={value}
    />
  );
}

export function PreferenceNumberSelect({
  label,
  onChange,
  options,
  testId,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  options: ReadonlyArray<{ label: string; value: number }>;
  testId?: string;
  value: number;
}): ReactElement {
  return (
    <PreferenceSelectBase
      label={label}
      onChange={(nextValue) => {
        onChange(Number(nextValue));
      }}
      options={options.map((option) => ({ label: option.label, value: String(option.value) }))}
      testId={testId}
      value={String(value)}
    />
  );
}

function PreferenceSelectBase({
  label,
  onChange,
  options,
  testId,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  testId?: string;
  value: string;
}): ReactElement {
  return (
    <div className="pb-[10px]">
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[var(--track-text-soft)]">
        {label}
      </label>
      <div className="mt-[10px] w-full md:w-[200px]">
        <SelectDropdown data-testid={testId} onChange={onChange} options={options} value={value} />
      </div>
    </div>
  );
}

export function ProfileHeroCard({
  accountSettingsHref,
  avatarImageUrl,
  onAvatarChange,
  profileName,
  rows,
}: {
  accountSettingsHref: string;
  avatarImageUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
  profileName: string;
  rows: ReadonlyArray<{ label: string; value: string }>;
}): ReactElement {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await unwrapWebApiResult(
        client.post<PostAvatarsResponses>({
          body: formData,
          bodySerializer: null,
          headers: { "Content-Type": null },
          url: "/avatars",
        }),
      );
      const url = result.avatar_urls?.["original"] ?? null;
      onAvatarChange?.(url);
      toast.success(t("toast:avatarUploaded"));
    } catch (err) {
      toast.error(err instanceof WebApiError ? err.userMessage : t("toast:failedToUploadAvatar"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setUploading(true);
    try {
      await unwrapWebApiResult(deleteAvatars());
      onAvatarChange?.(null);
      toast.success(t("toast:avatarRemoved"));
    } catch (err) {
      toast.error(err instanceof WebApiError ? err.userMessage : t("toast:failedToRemoveAvatar"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppPanel className="p-0" tone="transparent">
      <div className="flex flex-col md:flex-row md:min-h-[331px] md:items-start">
        <div className="flex items-center justify-center p-6 md:flex md:h-[331px] md:w-[268px] md:items-start">
          <div className="group relative flex size-[160px] items-start rounded-[80px] border border-[var(--track-border)] bg-[var(--track-surface)] md:size-[220px] md:rounded-[110px]">
            <input
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <div className="flex h-full w-full items-center justify-center py-[2px]">
              <UserAvatar
                className="size-[156px] rounded-[78px] bg-[var(--track-surface)] md:size-[216px] md:rounded-[108px]"
                imageUrl={avatarImageUrl ?? undefined}
                name={profileName}
                textClassName="text-5xl font-semibold md:text-6xl"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-[80px] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 md:rounded-[110px]">
              <button
                className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                title={t("uploadAvatar")}
                type="button"
              >
                <Upload className="size-5" />
              </button>
              {avatarImageUrl ? (
                <button
                  className="flex size-10 items-center justify-center rounded-full bg-white/20 text-red-300 hover:bg-white/30"
                  disabled={uploading}
                  onClick={() => void handleDelete()}
                  title={t("removeAvatar")}
                  type="button"
                >
                  <Trash2 className="size-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-4 md:min-h-[331px] md:pl-3">
          <div className="border-b border-[var(--track-border)] pb-3">
            <h2 className="text-[14px] font-semibold leading-[22.96px] text-white">
              {t("profile:personalDetailsAndPreferences")}
            </h2>
            <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-muted)]">
              {t("profile:changeDetailsDescription")}
            </p>
          </div>

          <dl className="space-y-0 py-5">
            {rows.map((row) => (
              <div className="flex items-center py-1" key={row.label}>
                <dt className="min-w-[130px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                  {row.label}
                </dt>
                <dd className="min-w-0 flex-1 text-[14px] font-medium leading-5 text-white">
                  <span className="block truncate">{row.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <a
              className="inline-flex h-9 items-center rounded-[8px] border border-[var(--track-border)] px-[25px] py-[9px] text-[14px] font-semibold leading-5 text-[var(--track-text-muted)]"
              href={accountSettingsHref}
            >
              {t("profile:accountSettings")}
            </a>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}
