import { type ReactElement, type ReactNode } from "react";

type PublicMainPanelFrameProps = {
  badge: string;
  children: ReactNode;
  description: string;
  sidebarBody?: string;
  sidebarCaption?: string;
  title: string;
};

export function PublicMainPanelFrame({
  badge,
  children,
  description,
  sidebarBody = "Email and password access for your account and default workspace context.",
  sidebarCaption = "TRACK SHELL",
  title,
}: PublicMainPanelFrameProps): ReactElement {
  return (
    <div className="min-h-dvh bg-[var(--track-surface)] px-5 py-5 text-[var(--track-text)]">
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[1440px] overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        <aside className="hidden w-[226px] shrink-0 flex-col justify-between border-r border-[var(--track-border)] bg-[var(--track-panel)] p-5 lg:flex">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-[var(--track-border)] bg-[var(--track-surface)] text-[12px] font-semibold text-[var(--track-accent-text)]">
                OT
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
                  {sidebarCaption}
                </p>
                <h2 className="text-[16px] font-semibold leading-[23px] text-[var(--track-text)]">
                  OpenToggl
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[14px] leading-5 text-[var(--track-text)]">
                Dense shell chrome, compact controls, and a direct handoff into the workspace.
              </p>
              <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">{sidebarBody}</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--track-border)] pt-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
              Product
            </p>
            <div className="space-y-2 text-[14px] leading-5 text-[var(--track-text)]">
              <p>Workspace shell</p>
              <p>Profile and settings</p>
              <p>Organization context</p>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 items-center justify-center bg-[var(--track-surface)] p-5 sm:p-8">
          <section className="w-full max-w-[440px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.16)]">
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
      sidebarBody="The left shell navigation is deferred until the session resolves. This panel stays within the same dark workspace frame."
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
