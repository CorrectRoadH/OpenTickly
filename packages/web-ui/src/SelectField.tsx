import { type ButtonHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";

/* Shared visual — matches CalendarSubviewSelect trigger style */
const selectBase =
  "h-9 rounded-lg border border-[var(--track-border)] bg-[var(--track-surface)] px-3 pr-8 text-[12px] font-medium text-white transition hover:border-[var(--track-control-border)]";

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--track-text-muted)]"
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

/** Native <select> with styled wrapper */
export function SelectField({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <div className="relative">
      <select
        className={`${selectBase} w-full appearance-none focus:outline-none focus:border-[var(--track-accent)] ${className}`}
        {...props}
      >
        {children}
      </select>
      <Chevron />
    </div>
  );
}

/** Button that looks identical to SelectField — for custom popover triggers */
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
        className={`${selectBase} flex w-full items-center ${className}`}
        ref={ref}
        type="button"
      >
        <span className="flex-1 truncate text-left">{children}</span>
      </button>
      <Chevron />
    </div>
  );
});
