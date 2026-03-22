import { type HTMLAttributes, type ReactNode } from "react";

type AppInlineNoticeTone = "error" | "success";

type AppInlineNoticeProps = {
  children: ReactNode;
  tone: AppInlineNoticeTone;
} & HTMLAttributes<HTMLElement>;

const toneStyles: Record<AppInlineNoticeTone, string> = {
  error: "border-rose-200 bg-rose-50/80 text-rose-800",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
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
