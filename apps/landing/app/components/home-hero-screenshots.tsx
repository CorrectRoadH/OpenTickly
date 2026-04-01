import { useState, useEffect } from "react";

const screenshots = [
  { src: "/hero/1.png", alt: "OpenToggl subscription page" },
  { src: "/hero/2.png", alt: "OpenToggl overview dashboard" },
  { src: "/hero/3.png", alt: "OpenToggl workspace" },
];

export default function HomeHeroScreenshots() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % screenshots.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface-muted)]">
      {/* Screenshot */}
      <div className="relative aspect-[16/10] w-full">
        {screenshots.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            fetchPriority={i === 0 ? "high" : undefined}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-[var(--duration-normal)] ${
              i === activeIndex
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-[1.01] opacity-0"
            }`}
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          />
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 py-3">
        {screenshots.map((s, i) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Show screenshot ${i + 1}`}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-[var(--duration-normal)] ${
              i === activeIndex ? "w-4 bg-[var(--track-accent)]" : "w-1.5 bg-[var(--track-border)]"
            }`}
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          />
        ))}
      </div>
    </div>
  );
}
