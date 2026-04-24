import { type ReactElement, type ReactNode } from "react";

type PublicMainPanelFrameProps = {
  badge: string;
  children: ReactNode;
  description?: string;
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
            <svg
              aria-hidden="true"
              className="size-9"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect fill="#e05d26" height="32" rx="8" width="32" />
              <text
                fill="white"
                fontFamily="Arial, sans-serif"
                fontSize="20"
                fontWeight="bold"
                textAnchor="middle"
                x="16"
                y="23"
              >
                t
              </text>
            </svg>
            <span className="text-[20px] font-semibold text-[var(--track-text)]">OpenTickly</span>
          </div>

          <section className="w-full max-w-[440px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5 shadow-[var(--track-depth-shadow-rest)]">
            <div className="mb-6 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
                {badge}
              </p>
              <h1 className="text-balance text-[20px] font-semibold leading-[30px] text-[var(--track-text)]">
                {title}
              </h1>
              {description && (
                <p className="text-pretty text-[14px] leading-5 text-[var(--track-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
