import { useState } from "react";

import { SurfaceCard, getAppButtonClassName } from "@opentoggl/web-ui";

const screenshotLabel = {
  en: "Product surface",
  zh: "产品界面",
} as const;

const screenshotContent = {
  en: [
    {
      src: "/hero/2.png",
      alt: "OpenToggl admin overview dashboard",
      title: "Overview",
      summary: "Workspace overview, reporting, and operational visibility in the same dark shell.",
    },
    {
      src: "/hero/1.png",
      alt: "OpenToggl self-hosted subscription page",
      title: "Subscription",
      summary:
        "Hosted and self-hosted flows share the same product surface instead of splitting features.",
    },
  ],
  zh: [
    {
      src: "/hero/2.png",
      alt: "OpenToggl 管理概览仪表盘",
      title: "概览",
      summary: "同一套深色工作区内展示概览、报表和运营可见性。",
    },
    {
      src: "/hero/1.png",
      alt: "OpenToggl 自托管订阅页面",
      title: "订阅",
      summary: "托管与自托管共享同一产品面，而不是分裂成两套体验。",
    },
  ],
} as const;

export default function HomeHeroScreenshots({
  locale,
}: {
  locale: keyof typeof screenshotContent;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const screenshots = screenshotContent[locale];

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--track-border)] px-5 py-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-accent-text)]">
            {screenshotLabel[locale]}
          </p>
          <p className="text-[14px] font-semibold text-white">{screenshots[activeIndex].title}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {screenshots.map((screenshot, index) => (
            <button
              aria-pressed={index === activeIndex}
              className={getAppButtonClassName({
                className:
                  index === activeIndex
                    ? "border-[var(--track-accent-border)] bg-[var(--track-accent-soft)] text-[var(--track-accent-text)] shadow-[var(--track-depth-shadow-rest)]"
                    : "text-[var(--track-text-muted)]",
                size: "sm",
                variant: "secondary",
              })}
              key={screenshot.src}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              {screenshot.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="hidden border-r border-[var(--track-border)] bg-[var(--track-surface-muted)] p-3 lg:flex lg:flex-col lg:gap-3">
          {screenshots.map((screenshot, index) => (
            <button
              className={`rounded-[8px] border px-4 py-3 text-left transition-[border-color,background-color,color] duration-[var(--duration-fast)] ${
                index === activeIndex
                  ? "border-[var(--track-accent-border)] bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]"
                  : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
              }`}
              key={screenshot.src}
              onClick={() => setActiveIndex(index)}
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
              type="button"
            >
              <p className="text-[14px] font-semibold">{screenshot.title}</p>
              <p className="mt-1 text-[12px] leading-5">{screenshot.summary}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4">
          <div className="relative overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)]">
            <div className="relative aspect-[16/10] w-full">
              {screenshots.map((screenshot, index) => (
                <img
                  alt={screenshot.alt}
                  className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[var(--duration-normal)] ${
                    index === activeIndex
                      ? "scale-100 opacity-100"
                      : "pointer-events-none scale-[1.01] opacity-0"
                  }`}
                  fetchPriority={index === 0 ? "high" : undefined}
                  key={screenshot.src}
                  loading={index === 0 ? "eager" : "lazy"}
                  src={screenshot.src}
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1 lg:hidden">
            <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
              {screenshots[activeIndex].summary}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {screenshots.map((screenshot, index) => (
                <button
                  aria-pressed={index === activeIndex}
                  className={getAppButtonClassName({
                    className:
                      index === activeIndex
                        ? "border-[var(--track-accent-border)] bg-[var(--track-accent-soft)] text-[var(--track-accent-text)] shadow-[var(--track-depth-shadow-rest)]"
                        : "text-[var(--track-text-muted)]",
                    size: "sm",
                    variant: "secondary",
                  })}
                  key={screenshot.src}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  {screenshot.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
