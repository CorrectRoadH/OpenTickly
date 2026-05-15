import type React from "react";
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
      className={`flex h-8 items-center gap-1 rounded-[6px] px-2.5 text-[12px] font-medium normal-case tracking-normal ${
        disabled ? "text-[var(--track-text-disabled)]" : "text-white"
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
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">{title}</h1>
          {subtitle ? (
            <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">{subtitle}</p>
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
  clickable = false,
  ...rest
}: React.ComponentPropsWithoutRef<"div"> & {
  clickable?: boolean;
}) {
  const clickableClasses = clickable
    ? "cursor-pointer transition-all duration-[var(--duration-press)] hover:-translate-y-px hover:shadow-[var(--track-depth-shadow-hover)] active:translate-y-0.5 active:shadow-[var(--track-depth-shadow-active)]"
    : "";

  return (
    <div
      {...rest}
      className={getSurfaceClassName("default", `${clickableClasses} ${className}`.trim())}
      style={clickable ? { transitionTimingFunction: "var(--ease-press)" } : undefined}
    >
      {children}
    </div>
  );
}

export function DirectoryHeaderCell({ children }: { children?: ReactNode }) {
  return <div className="flex h-[36px] items-center">{children}</div>;
}

export function DirectoryTableCell({ children }: { children: ReactNode }) {
  return <div className="flex h-[44px] items-center text-[14px] text-white">{children}</div>;
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
