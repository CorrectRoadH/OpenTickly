import { type HTMLAttributes, type ReactNode } from "react";

type AppSurfaceStateTone = "loading" | "error" | "empty" | "success";

type AppSurfaceStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
  tone: AppSurfaceStateTone;
} & HTMLAttributes<HTMLElement>;

const toneStyles: Record<AppSurfaceStateTone, string> = {
  empty: "border-slate-200 bg-slate-50/70 text-slate-700",
  error: "border-rose-200 bg-rose-50/70 text-rose-800",
  loading: "border-slate-200 bg-white/95 text-slate-700",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
};

const badgeStyles: Record<AppSurfaceStateTone, string> = {
  empty: "border-slate-300 bg-white text-slate-700",
  error: "border-rose-300 bg-white text-rose-700",
  loading: "border-slate-300 bg-white text-slate-700",
  success: "border-emerald-300 bg-white text-emerald-700",
};

const toneLabel: Record<AppSurfaceStateTone, string> = {
  empty: "Empty",
  error: "Error",
  loading: "Loading",
  success: "Saved",
};

export function AppSurfaceState({
  action,
  className,
  description,
  title,
  tone,
  ...props
}: AppSurfaceStateProps) {
  return (
    <section
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`rounded-[1.75rem] border p-5 ${toneStyles[tone]} ${className ?? ""}`}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    >
      <div className="space-y-3">
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeStyles[tone]}`}
        >
          {toneLabel[tone]}
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="text-sm leading-6">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}
