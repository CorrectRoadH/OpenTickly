import { type ButtonHTMLAttributes, forwardRef, useCallback } from "react";

import { Dropdown, useDropdownClose } from "./DropdownMenu.tsx";

export type SelectButtonVariant = "default" | "secondary";

const selectBase =
  "rounded-full border font-semibold leading-none outline-none transition-[transform,box-shadow,border-color,background-color] duration-[var(--duration-normal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--track-accent)]";

const selectVariantClass: Record<SelectButtonVariant, string> = {
  default:
    "h-10 border-2 border-[var(--track-border)] bg-[var(--track-surface)] px-4 pr-9 text-[12px] text-white shadow-[var(--track-depth-shadow-rest)] hover:-translate-y-px hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)]",
  secondary:
    "h-8 border border-[var(--track-border)] bg-transparent px-3 pr-8 text-[12px] text-[var(--track-text-soft)] shadow-none hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white active:bg-[var(--track-surface-muted)]",
};

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
  variant?: SelectButtonVariant;
};

export const SelectButton = forwardRef<HTMLButtonElement, SelectButtonProps>(function SelectButton(
  { children, className = "", variant = "default", ...props },
  ref,
) {
  return (
    <div className="relative">
      <button
        {...props}
        className={`${selectBase} ${selectVariantClass[variant]} flex w-full items-center gap-2 !pr-3 ${className}`}
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
  variant?: SelectButtonVariant;
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
  variant = "default",
}: SelectDropdownProps) {
  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ?? String(value);
  const displayLabel = prefix ? `${prefix}: ${selectedLabel}` : selectedLabel;

  return (
    <Dropdown
      className={className}
      trigger={
        <SelectButton
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          data-testid={testId}
          disabled={disabled}
          id={id}
          variant={variant}
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
      className={`flex w-full items-center rounded-[6px] px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--track-row-hover)] ${
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
