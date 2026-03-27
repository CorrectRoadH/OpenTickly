import { useState } from "react";

const screenshots = [
  {
    src: "/hero/2.png",
    alt: "OpenToggl admin overview dashboard",
    title: "Overview",
  },
  {
    src: "/hero/1.png",
    alt: "OpenToggl self-hosted subscription page",
    title: "Subscription",
  },
] as const;

export default function HomeHeroScreenshots() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sideIndex = activeIndex === 0 ? 1 : 0;

  return (
    <div className="mt-10">
      <div className="relative hidden min-h-[520px] items-center justify-center overflow-visible lg:flex">
        <div className="pointer-events-none absolute inset-x-[16%] bottom-8 z-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.28),rgba(59,130,246,0.08)_55%,transparent_75%)] blur-3xl" />

        <button
          className="group absolute inset-y-14 left-0 z-0 w-[30%] -translate-x-[22%] -rotate-[10deg] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f141d] opacity-85 shadow-[0_32px_90px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-x-[18%] hover:-rotate-[8deg] hover:scale-[1.03] hover:opacity-100"
          onClick={() => setActiveIndex(sideIndex)}
          type="button"
        >
          <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(8,12,18,0.52),transparent_35%,transparent_65%,rgba(8,12,18,0.28))] transition-opacity duration-300 group-hover:opacity-40" />
          <img
            alt={screenshots[sideIndex].alt}
            className="block h-full w-full object-cover object-left transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            src={screenshots[sideIndex].src}
          />
        </button>

        <button
          className="group absolute inset-y-14 right-0 z-0 w-[30%] translate-x-[22%] rotate-[10deg] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f141d] opacity-85 shadow-[0_32px_90px_rgba(0,0,0,0.45)] transition duration-300 hover:translate-x-[18%] hover:rotate-[8deg] hover:scale-[1.03] hover:opacity-100"
          onClick={() => setActiveIndex(sideIndex)}
          type="button"
        >
          <div className="absolute inset-0 z-10 bg-[linear-gradient(270deg,rgba(8,12,18,0.52),transparent_35%,transparent_65%,rgba(8,12,18,0.28))] transition-opacity duration-300 group-hover:opacity-40" />
          <img
            alt={screenshots[sideIndex].alt}
            className="block h-full w-full object-cover object-right transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            src={screenshots[sideIndex].src}
          />
        </button>

        <div className="relative z-10 mx-auto w-[86%] overflow-hidden rounded-[30px] border border-fd-border bg-[#0f141d] shadow-[0_36px_120px_rgba(0,0,0,0.52)]">
          <div className="relative aspect-[16/10] w-full">
            {screenshots.map((screenshot, index) => (
              <img
                alt={screenshot.alt}
                className={`absolute inset-0 h-full w-full transition-all duration-500 ${
                  index === activeIndex
                    ? "scale-100 opacity-100"
                    : "pointer-events-none scale-[1.02] opacity-0"
                }`}
                fetchPriority={index === 0 ? "high" : undefined}
                key={screenshot.src}
                loading={index === 0 ? "eager" : "lazy"}
                src={screenshot.src}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-[linear-gradient(180deg,transparent,rgba(8,12,18,0.84))] px-5 py-4">
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/80">
              {screenshots[activeIndex].title}
            </div>
            <div className="flex items-center gap-2">
              {screenshots.map((screenshot, index) => (
                <button
                  aria-label={`Show ${screenshot.title}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/35 hover:bg-white/60"
                  }`}
                  key={screenshot.src}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        <div className="overflow-hidden rounded-[24px] border border-fd-border">
          <img
            alt={screenshots[activeIndex].alt}
            className="block h-full w-full"
            fetchPriority="high"
            loading="eager"
            src={screenshots[activeIndex].src}
          />
        </div>

        <div className="flex items-center justify-center gap-2">
          {screenshots.map((screenshot, index) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                index === activeIndex
                  ? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
                  : "border border-fd-border bg-white/5 text-fd-muted-foreground"
              }`}
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
  );
}
