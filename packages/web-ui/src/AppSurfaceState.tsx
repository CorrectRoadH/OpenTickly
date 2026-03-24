import { type HTMLAttributes, type ReactNode } from "react";

type AppSurfaceStateTone = "loading" | "error" | "empty" | "success";

type AppSurfaceStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
  tone: AppSurfaceStateTone;
} & HTMLAttributes<HTMLElement>;

const toneStyles: Record<AppSurfaceStateTone, string> = {
  empty:
    "border-[color:var(--track-state-neutral-border)] bg-[color:var(--track-state-neutral-surface)] text-[color:var(--track-state-neutral-text)]",
  error:
    "border-[color:var(--track-state-error-border)] bg-[color:var(--track-state-error-surface)] text-[color:var(--track-state-error-text)]",
  loading:
    "border-[color:var(--track-state-neutral-border)] bg-[color:var(--track-state-neutral-surface)] text-[color:var(--track-state-neutral-text)]",
  success:
    "border-[color:var(--track-state-success-border)] bg-[color:var(--track-state-success-surface)] text-[color:var(--track-state-success-text)]",
};

const badgeStyles: Record<AppSurfaceStateTone, string> = {
  empty:
    "border-[color:var(--track-state-neutral-border)] bg-white text-[color:var(--track-state-neutral-text)]",
  error:
    "border-[color:var(--track-state-error-border)] bg-white text-[color:var(--track-state-error-text)]",
  loading:
    "border-[color:var(--track-state-neutral-border)] bg-white text-[color:var(--track-state-neutral-text)]",
  success:
    "border-[color:var(--track-state-success-border)] bg-white text-[color:var(--track-state-success-text)]",
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
