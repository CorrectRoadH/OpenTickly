import { type HTMLAttributes, type ReactNode } from "react";

type AppInlineNoticeTone = "error" | "success";

type AppInlineNoticeProps = {
  children: ReactNode;
  tone: AppInlineNoticeTone;
} & HTMLAttributes<HTMLElement>;

const toneStyles: Record<AppInlineNoticeTone, string> = {
  error:
    "border-[color:var(--track-state-error-border)] bg-[color:var(--track-state-error-surface)] text-[color:var(--track-state-error-text)]",
  success:
    "border-[color:var(--track-state-success-border)] bg-[color:var(--track-state-success-surface)] text-[color:var(--track-state-success-text)]",
};

export function AppInlineNotice({ children, className, tone, ...props }: AppInlineNoticeProps) {
  return (
    <section
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`rounded-[1.5rem] border px-4 py-3 text-sm font-semibold ${toneStyles[tone]} ${className ?? ""}`}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    >
      {children}
    </section>
  );
}
