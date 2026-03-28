import { type ReactElement, type ReactNode } from "react";

type PublicMainPanelFrameProps = {
  badge: string;
  children: ReactNode;
  description: string;
  title: string;
};

export function PublicMainPanelFrame({
  badge,
  children,
  description,
  title,
}: PublicMainPanelFrameProps): ReactElement {
  return (
    <div className="min-h-dvh bg-[var(--track-surface)] px-5 py-5 text-[var(--track-text)]">
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[1440px] items-center justify-center overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center p-5 sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[12px] font-semibold text-[var(--track-accent-text)]">
              OT
            </div>
            <span className="text-[18px] font-semibold text-[var(--track-text)]">OpenToggl</span>
          </div>

          <section className="w-full max-w-[440px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5 shadow-[var(--track-shadow-outline)]">
            <div className="mb-6 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
                {badge}
              </p>
              <h1 className="text-balance text-[21px] font-semibold leading-[30px] text-[var(--track-text)]">
                {title}
              </h1>
              <p className="text-pretty text-[14px] leading-5 text-[var(--track-text-muted)]">
                {description}
              </p>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

export function PublicMainPanelLoading(): ReactElement {
  return (
    <PublicMainPanelFrame
      badge="Loading"
      description="Checking the current session and preparing the next panel."
      title="Bootstrapping your workspace"
    >
      <div aria-hidden="true" className="space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--track-border)]" />
          <div className="h-9 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-[var(--track-border)]" />
          <div className="h-9 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)]" />
        </div>
        <div className="h-9 w-full rounded-[6px] bg-[var(--track-accent-soft)]" />
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-[var(--track-border)]" />
          <div className="h-3 w-4/5 rounded bg-[var(--track-border)]" />
        </div>
      </div>
      <span className="sr-only">Loading workspace session</span>
    </PublicMainPanelFrame>
  );
}
