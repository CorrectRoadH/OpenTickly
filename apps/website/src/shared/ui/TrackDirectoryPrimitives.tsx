import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

export function DirectoryFilterChip({
  disabled = false,
  label,
}: {
  disabled?: boolean;
  label: string;
}) {
  return (
    <span
      className={`flex h-[26px] items-center gap-1 rounded-md border px-2.5 text-[11px] normal-case tracking-normal ${
        disabled
          ? "border-[var(--track-border)] text-[#5d5d5d]"
          : "border-[var(--track-border)] text-white"
      }`}
    >
      {label}
    </span>
  );
}

export function ShellPageHeader({
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

export function ShellPrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function ShellSecondaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-9 items-center rounded-[8px] border border-[var(--track-border)] px-4 text-[12px] font-semibold text-[var(--track-text-muted)] ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function ShellSurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function ShellToast({
  description,
  title,
  tone,
}: {
  description: string;
  title: string;
  tone: "error" | "success";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 min-w-[360px] rounded-[8px] border px-6 py-5 shadow-[0px_10px_30px_rgba(0,0,0,0.35)] ${
        tone === "success"
          ? "border-[var(--track-border)] bg-[var(--track-surface)]"
          : "border-[#6a2e41] bg-[#22161b]"
      }`}
    >
      <p
        className={`text-[16px] font-semibold leading-[23px] ${
          tone === "success" ? "text-[#12b76a]" : "text-[#ff6b8f]"
        }`}
      >
        {title}
      </p>
      <p className="mt-2 text-[14px] leading-5 text-white">{description}</p>
    </div>
  );
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
