import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type HomeHeroScreenshotsProps = {
  locale: Locale;
};

const images = [{ src: "/hero/2.png" }, { src: "/hero/1.png" }, { src: "/hero/3.png" }];

const altByLocale: Record<Locale, string> = {
  en: "OpenToggl dashboard preview",
  zh: "OpenToggl 仪表盘预览",
  es: "Vista previa del panel de OpenToggl",
  ja: "OpenToggl ダッシュボードプレビュー",
  fr: "Aperçu du tableau de bord OpenToggl",
  ko: "OpenToggl 대시보드 미리보기",
};

export default function HomeHeroScreenshots({ locale }: HomeHeroScreenshotsProps) {
  const [active, setActive] = useState(0);
  const alt = altByLocale[locale];

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
            alt={`${alt} ${index + 1}`}
            className={`block w-full transition-opacity duration-500 ${
              index === active ? "relative opacity-100" : "absolute inset-0 opacity-0"
            }`}
            fetchPriority={index === 0 ? "high" : "low"}
            height={1910}
            loading={index === 0 ? "eager" : "lazy"}
            src={image.src}
            width={3838}
          />
        ))}
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
