import { Upload, Trash2 } from "lucide-react";
import { type ReactElement, type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

import { AppPanel, SelectField } from "@opentoggl/web-ui";

import { postAvatars, deleteAvatars } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
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
      <span className="relative mt-[3px] mr-[10px] flex size-[14px] shrink-0 items-center justify-center">
        <input
          checked={checked}
          className="peer absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            onChange(event.target.checked);
          }}
          type="checkbox"
        />
        <span className="flex size-[14px] items-center justify-center rounded-[4px] border border-[var(--track-border)] bg-[var(--track-surface)] peer-checked:border-[var(--track-accent)] peer-checked:bg-[var(--track-accent)]">
          {checked ? (
            <span className="text-[10px] font-semibold leading-none text-black">✓</span>
          ) : null}
        </span>
      </span>
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
      <div className="mt-[10px] w-[200px]">
        <SelectField
          data-testid={testId}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await unwrapWebApiResult(
        postAvatars({
          body: formData as never,
          bodySerializer: (body) => body as FormData,
        }),
      );
      const url = result.avatar_urls?.["original"] ?? null;
      onAvatarChange?.(url);
      toast.success("Avatar uploaded");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setUploading(true);
    try {
      await unwrapWebApiResult(deleteAvatars());
      onAvatarChange?.(null);
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppPanel className="p-0" tone="transparent">
      <div className="flex min-h-[331px] items-start">
        <div className="flex h-[331px] w-[268px] items-start p-6">
          <div className="group relative flex size-[220px] items-start rounded-[110px] border border-[var(--track-border)] bg-[var(--track-surface)]">
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
            <div className="flex h-full items-center justify-center py-[2px]">
              <UserAvatar
                className="size-[216px] rounded-[108px] bg-[var(--track-surface)]"
                imageUrl={avatarImageUrl ?? undefined}
                name={profileName}
                textClassName="text-6xl font-semibold"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-[110px] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                title="Upload avatar"
                type="button"
              >
                <Upload className="size-5" />
              </button>
              {avatarImageUrl ? (
                <button
                  className="flex size-10 items-center justify-center rounded-full bg-white/20 text-red-300 hover:bg-white/30"
                  disabled={uploading}
                  onClick={() => void handleDelete()}
                  title="Remove avatar"
                  type="button"
                >
                  <Trash2 className="size-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-[331px] min-w-0 flex-1 flex-col pl-3">
          <div className="border-b border-[var(--track-border)] pb-3">
            <h2 className="text-[14px] font-semibold leading-[22.96px] text-white">
              Personal details & preferences
            </h2>
            <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-muted)]">
              Change details, login methods and your password in Account settings.
            </p>
          </div>

          <dl className="space-y-0 py-5">
            {rows.map((row) => (
              <div className="flex items-center py-1" key={row.label}>
                <dt className="min-w-[130px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                  {row.label}
                </dt>
                <dd className="text-[14px] font-medium leading-5 text-white">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <a
              className="inline-flex h-9 items-center rounded-[8px] border border-[var(--track-border)] px-[25px] py-[9px] text-[14px] font-semibold leading-5 text-[var(--track-text-muted)]"
              href={accountSettingsHref}
            >
              Account settings
            </a>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}
