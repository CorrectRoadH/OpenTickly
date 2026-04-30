import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type HomeHeroScreenshotsProps = {
  locale: Locale;
};

const images = [
  { src: "/hero/opentoggl-overview.webp", altKey: "overview" },
  { src: "/hero/opentoggl-free.webp", altKey: "free" },
  { src: "/hero/opentoggl-calendar-view.webp", altKey: "calendar" },
];

const altByLocale: Record<Locale, Record<string, string>> = {
  en: {
    overview: "OpenTickly time tracking overview with timer and entries",
    free: "OpenTickly free and open source time tracking",
    calendar: "OpenTickly calendar view showing tracked time by day",
  },
  zh: {
    overview: "OpenTickly 时间追踪概览，含计时器和条目",
    free: "OpenTickly 免费开源时间追踪",
    calendar: "OpenTickly 日历视图，按天展示追踪时间",
  },
  es: {
    overview: "Vista general de seguimiento de tiempo de OpenTickly",
    free: "OpenTickly seguimiento de tiempo gratuito y de código abierto",
    calendar: "Vista de calendario de OpenTickly mostrando tiempo por día",
  },
  ja: {
    overview: "OpenTickly タイムトラッキング概要（タイマーとエントリ付き）",
    free: "OpenTickly 無料オープンソースのタイムトラッキング",
    calendar: "OpenTickly カレンダービュー（日別の追跡時間表示）",
  },
  fr: {
    overview: "Vue d'ensemble du suivi du temps OpenTickly avec minuteur et entrées",
    free: "OpenTickly suivi du temps gratuit et open source",
    calendar: "Vue calendrier OpenTickly affichant le temps suivi par jour",
  },
  ko: {
    overview: "OpenTickly 시간 추적 개요 (타이머 및 항목 포함)",
    free: "OpenTickly 무료 오픈소스 시간 추적",
    calendar: "OpenTickly 캘린더 뷰 (일별 추적 시간 표시)",
  },
  pl: {
    overview: "Przegląd śledzenia czasu OpenTickly z timerem i wpisami",
    free: "OpenTickly — darmowe śledzenie czasu open source",
    calendar: "Widok kalendarza OpenTickly pokazujący śledzony czas wg dnia",
  },
  pt: {
    overview: "Visão geral do rastreamento de tempo do OpenTickly com timer e registros",
    free: "OpenTickly rastreamento de tempo gratuito e de código aberto",
    calendar: "Visualização de calendário do OpenTickly mostrando tempo rastreado por dia",
  },
};

export default function HomeHeroScreenshots({ locale }: HomeHeroScreenshotsProps) {
  const [active, setActive] = useState(0);
  const alts = altByLocale[locale];

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        {images.map((image, index) => (
          <img
            key={image.src}
            alt={alts[image.altKey]}
            className={`block w-full transition-opacity duration-500 ${
              index === active ? "relative opacity-100" : "absolute inset-0 opacity-0"
            }`}
            fetchPriority={index === 0 ? "high" : "low"}
            height={1924}
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, 896px"
            src={image.src}
            width={3836}
          />
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[1.7%] top-[1.5%] h-[4.3%] w-[12%] bg-[#101114]"
        />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Show screenshot ${index + 1}`}
            className={`size-2 rounded-full transition-colors ${
              index === active
                ? "bg-[var(--track-accent)]"
                : "bg-[var(--track-border)] hover:bg-[var(--track-text-muted)]"
            }`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
