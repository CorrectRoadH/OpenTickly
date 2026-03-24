import { type ReactElement, type ReactNode } from "react";

import { AppPanel, ShellSecondaryButton } from "@opentoggl/web-ui";

import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";

const sectionCardClassName =
  "overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]";

export function PreferenceCard({
  action,
  children,
  description,
  title,
}: {
  action?: ReactElement;
  children: ReactNode;
  description?: string;
  title: string;
}): ReactElement {
  return (
    <section className={sectionCardClassName}>
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
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}): ReactElement {
  return <PreferenceSelectBase label={label} onChange={onChange} options={options} value={value} />;
}

export function PreferenceNumberSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  options: ReadonlyArray<{ label: string; value: number }>;
  value: number;
}): ReactElement {
  return (
    <PreferenceSelectBase
      label={label}
      onChange={(nextValue) => {
        onChange(Number(nextValue));
      }}
      options={options.map((option) => ({ label: option.label, value: String(option.value) }))}
      value={String(value)}
    />
  );
}

function PreferenceSelectBase({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}): ReactElement {
  return (
    <div className="pb-[10px]">
      <label className="block text-[11px] font-semibold uppercase leading-[11px] text-[var(--track-text-soft)]">
        {label}
      </label>
      <div className="relative mt-[10px] h-[39px] w-[200px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <select
          className="h-full w-full appearance-none rounded-[8px] bg-transparent px-[10px] text-[14px] font-medium leading-none text-[var(--track-text-muted)] outline-none"
          onChange={(event) => {
            onChange(event.target.value);
          }}
          value={value}
        >
          {options.map((option) => (
            <option
              className="bg-[var(--track-surface)] text-[var(--track-text-muted)]"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-[14px] text-[10px] text-[var(--track-text-muted)]">
          ▾
        </span>
      </div>
    </div>
  );
}

export function IntegrationTile({
  accent,
  title,
}: {
  accent: string;
  title: string;
}): ReactElement {
  return (
    <div className="flex h-[70px] w-[300px] items-center rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4">
      <div
        className="flex size-6 items-center justify-center rounded-[4px]"
        style={{ backgroundColor: accent }}
      >
        <span className="text-[10px] font-bold text-black">■</span>
      </div>
      <div className="ml-3">
        <p className="text-[11px] font-semibold uppercase leading-3 text-white">{title}</p>
        <p className="text-[12px] font-medium leading-4 text-[#4ca4ff]">Connect</p>
      </div>
    </div>
  );
}

export function ProfileHeroCard({
  accountSettingsHref,
  avatarImageUrl,
  profileName,
  rows,
}: {
  accountSettingsHref: string;
  avatarImageUrl?: string | null;
  profileName: string;
  rows: ReadonlyArray<{ label: string; value: string }>;
}): ReactElement {
  return (
    <AppPanel className="p-0" tone="transparent">
      <div className="flex min-h-[331px] items-start">
        <div className="flex h-[331px] w-[268px] items-start p-6">
          <div className="flex size-[220px] items-start rounded-[110px] border border-[var(--track-border)] bg-[var(--track-surface)]">
            <div className="flex h-full items-center justify-center py-[2px]">
              <UserAvatar
                className="size-[216px] rounded-[108px] bg-[var(--track-surface)]"
                imageUrl={avatarImageUrl ?? undefined}
                name={profileName}
                textClassName="text-6xl font-semibold"
              />
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
              rel="noreferrer"
              target="_blank"
            >
              Account settings
            </a>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}

export function ProfileBetaProgramCard(): ReactElement {
  return (
    <section className="overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-black shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.24),inset_0_-1px_0_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-center gap-10 px-10 py-4">
        <div className="flex h-[240px] w-[340px] items-center justify-center">
          <div className="relative size-[240px]">
            <div className="absolute left-[14px] top-[59px] h-[118px] w-[122px] rounded-[60px] bg-[#c0b8c3]" />
            <div className="absolute left-[80px] top-[14px] h-[76px] w-[92px] rounded-t-[50px] border-[16px] border-b-0 border-[#564260]" />
            <div className="absolute left-[79px] top-[123px] h-[78px] w-[102px] rounded-[8px] bg-[#ffde91]" />
            <div className="absolute left-[113px] top-[144px] h-[37px] w-[35px] rounded-[18px] bg-[#2c1338]" />
            <div className="absolute left-[66px] top-[120px] h-[82px] w-[116px] rounded-[8px] border border-[#f8cd76]" />
            <div className="absolute left-[44px] top-[131px] size-[13px] rounded-full bg-[#2c1338]" />
          </div>
        </div>

        <div className="max-w-[443px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-[31px] pb-[21px] pt-[30.5px]">
          <h3 className="text-[14px] font-semibold leading-[22.96px] text-white">
            You&apos;re a Beta Tester
          </h3>
          <p className="mt-[17.5px] max-w-[352px] text-[14px] font-medium leading-[21px] text-[var(--track-text)]">
            You get early versions of our new releases before anyone else. New features are
            indicated with{" "}
            <span className="rounded-[8px] bg-[var(--track-text)] px-[6px] py-[4px] text-[12px] font-semibold uppercase leading-3 text-black">
              Beta
            </span>{" "}
            symbol.
          </p>
          <div className="mt-[17.5px] flex items-center gap-7 pt-[14.5px]">
            <ShellSecondaryButton disabled type="button">
              Disable beta features
            </ShellSecondaryButton>
            <a
              className="text-[14px] font-medium leading-[14px] text-[var(--track-accent-text)]"
              href="https://support.toggl.com/en/articles/2220661-your-toggl-track-account#beta-tester-program"
              rel="noreferrer"
              target="_blank"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
