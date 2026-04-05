type HomeHeroScreenshotsProps = {
  locale: "en" | "zh";
};

const heroImageByLocale = {
  en: {
    alt: "OpenToggl dashboard preview",
    src: "/hero/2.png",
  },
  zh: {
    alt: "OpenToggl 仪表盘预览",
    src: "/hero/2.png",
  },
} as const;

export default function HomeHeroScreenshots({ locale }: HomeHeroScreenshotsProps) {
  const image = heroImageByLocale[locale];

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]">
      <img
        alt={image.alt}
        className="block h-full w-full"
        fetchPriority="high"
        height={1910}
        loading="eager"
        src={image.src}
        width={3838}
      />
    </div>
  );
}
