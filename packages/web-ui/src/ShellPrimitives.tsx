import type { ReactElement, ReactNode } from "react";

import { getSurfaceClassName } from "./surfaceStyles.ts";

export function DirectoryFilterChip({
  disabled = false,
  label,
}: {
  disabled?: boolean;
  label: string;
}) {
  return (
    <span
      className={`flex h-[34px] items-center gap-1 rounded-lg px-2 text-[14px] normal-case tracking-normal ${
        disabled ? "text-[#5d5d5d]" : "text-white"
      }`}
    >
      {label}
    </span>
  );
}

export function PageHeader({
  action,
  bordered = false,
  subtitle,
  title,
}: {
  action?: ReactNode;
  bordered?: boolean;
  subtitle?: string;
  title: string;
}): ReactElement {
  return (
    <header className={`${bordered ? "border-b border-[var(--track-border)]" : ""}`.trim()}>
      <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="space-y-1">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">{title}</h1>
          {subtitle ? (
            <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={getSurfaceClassName("default", className)}>{children}</div>;
}

export function DirectoryHeaderCell({ children }: { children?: ReactNode }) {
  return <div className="flex h-[34px] items-center">{children}</div>;
}

export function DirectoryTableCell({ children }: { children: ReactNode }) {
  return <div className="flex h-[54px] items-center text-[12px] text-white">{children}</div>;
}

export function DirectorySurfaceMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`px-5 py-8 text-sm ${
        tone === "error" ? "text-rose-300" : "text-[var(--track-text-muted)]"
      }`}
    >
      {message}
    </div>
  );
}
