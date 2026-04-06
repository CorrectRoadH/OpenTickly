import { AppLinkButton, SurfaceCard } from "@opentoggl/web-ui";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type ProofCardItem = {
  body: string;
  cta: string;
  href: string;
  title: string;
  value: string;
};

type ProofGridCardProps = {
  icons: readonly LucideIcon[];
  items: readonly ProofCardItem[];
};

export function ProofGridCard({ icons, items }: ProofGridCardProps) {
  return (
    <SurfaceCard className="p-0">
      <div className="grid md:grid-cols-3">
        {items.map((item, index) => {
          const Icon = icons[index % icons.length]!;
          const external = item.href.startsWith("http");

          return (
            <div
              key={item.title}
              className={`p-5 ${index > 0 ? "border-t border-[var(--track-border)] md:border-l md:border-t-0" : ""}`}
            >
              <div className="flex size-8 items-center justify-center rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
                {item.title}
              </p>
              <p className="mt-2 text-[14px] font-semibold text-[var(--track-text)]">
                {item.value}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-[var(--track-text-muted)]">
                {item.body}
              </p>
              <div className="mt-4">
                <AppLinkButton
                  href={item.href}
                  size="sm"
                  target={external ? "_blank" : undefined}
                  variant={index === 0 ? "primary" : "secondary"}
                >
                  {item.cta}
                  {external ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : null}
                </AppLinkButton>
              </div>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
