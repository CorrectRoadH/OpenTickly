import type { ReactNode } from "react";

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
