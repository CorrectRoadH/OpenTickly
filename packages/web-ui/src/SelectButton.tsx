import { type ButtonHTMLAttributes, forwardRef, useCallback } from "react";

import { Dropdown, useDropdownClose } from "./DropdownMenu.tsx";

/* Shared visual — matches CalendarSubviewSelect trigger style */
const selectBase =
  "h-9 rounded-lg border border-[var(--track-border)] bg-transparent px-3 pr-8 text-[12px] font-medium text-white transition hover:border-[var(--track-control-border)]";

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 text-[var(--track-text-muted)] ${className}`}
      fill="none"
      height="12"
      viewBox="0 0 12 12"
      width="12"
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Button that looks identical to a select — for custom popover triggers */
type SelectButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  className?: string;
};

export const SelectButton = forwardRef<HTMLButtonElement, SelectButtonProps>(function SelectButton(
  { children, className = "", ...props },
  ref,
) {
  return (
    <div className="relative">
      <button
        {...props}
        className={`${selectBase} flex w-full items-center gap-2 !pr-3 ${className}`}
        ref={ref}
        type="button"
      >
        <span className="flex-1 truncate text-left">{children}</span>
        <Chevron />
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// SelectDropdown — SelectButton + Dropdown with listbox options
// ---------------------------------------------------------------------------

export type SelectOption = { label: string; value: string };

type SelectDropdownProps = {
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  prefix?: string;
  value: string | number;
};

export function SelectDropdown({
  "aria-label": ariaLabel,
  className,
  "data-testid": testId,
  disabled,
  id,
  onChange,
  options,
  prefix,
  value,
}: SelectDropdownProps) {
  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ?? String(value);
  const displayLabel = prefix ? `${prefix}: ${selectedLabel}` : selectedLabel;

  return (
    <Dropdown
      trigger={
        <SelectButton
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={className}
          data-testid={testId}
          disabled={disabled}
          id={id}
        >
          {displayLabel}
        </SelectButton>
      }
    >
      <div className="py-1" role="listbox">
        {options.map((option) => (
          <SelectDropdownItem
            key={option.value}
            label={option.label}
            onChange={onChange}
            selected={String(option.value) === String(value)}
            value={option.value}
          />
        ))}
      </div>
    </Dropdown>
  );
}

function SelectDropdownItem({
  label,
  onChange,
  selected,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  selected: boolean;
  value: string;
}) {
  const close = useDropdownClose();
  const handleClick = useCallback(() => {
    onChange(value);
    close();
  }, [onChange, value, close]);

  return (
    <button
      aria-selected={selected}
      className={`flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/6 ${
        selected ? "font-medium text-white" : "text-[var(--track-text-soft)]"
      }`}
      onClick={handleClick}
      role="option"
      type="button"
    >
      {label}
    </button>
  );
}
