import { type SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export function SelectField({ className = "", children, ...props }: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        className={`h-9 w-full appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[12px] text-white shadow-[0_1px_0_0_var(--track-depth-border)] focus:outline-none focus:ring-1 focus:ring-[var(--track-accent)] ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--track-text-muted)]"
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
    </div>
  );
}
