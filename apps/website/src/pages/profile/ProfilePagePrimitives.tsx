import { type ReactElement, type ReactNode } from "react";

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
