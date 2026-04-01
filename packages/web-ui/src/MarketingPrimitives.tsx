import type { ReactElement, ReactNode } from "react";

// ---------------------------------------------------------------------------
// MarketingEyebrow
// ---------------------------------------------------------------------------

export function MarketingEyebrow({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// MarketingCard
// ---------------------------------------------------------------------------

type MarketingCardProps = {
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function MarketingCard({
  children,
  description,
  eyebrow,
  title,
}: MarketingCardProps): ReactElement {
  return (
    <div className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-4">
      {eyebrow ? <MarketingEyebrow>{eyebrow}</MarketingEyebrow> : null}
      <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      <p className="mt-1 text-[13px] leading-5 text-[var(--track-text-muted)]">{description}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarketingSection
// ---------------------------------------------------------------------------

type MarketingSectionProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function MarketingSection({
  children,
  description,
  title,
}: MarketingSectionProps): ReactElement {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[16px] font-semibold text-white">{title}</h2>
        <p className="text-[14px] leading-6 text-[var(--track-text-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}
