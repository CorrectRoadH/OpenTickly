import type { ReactNode } from "react";

export function DropdownMenu({
  children,
  className = "",
  minWidth = "140px",
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div
      className={`rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-1 shadow-[0_16px_32px_var(--track-shadow-overlay)] ${className}`.trim()}
      style={{ minWidth }}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  destructive = false,
  onClick,
}: {
  children: ReactNode;
  destructive?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] transition-colors duration-[80ms] hover:bg-[var(--track-row-hover)] ${
        destructive ? "text-rose-400" : "text-[var(--track-overlay-text)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
