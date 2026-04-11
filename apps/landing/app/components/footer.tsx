import { i18n } from "@/lib/i18n";

const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  ja: "日本語",
  fr: "Français",
  ko: "한국어",
};

export default function Footer({ locale }: { locale: string }) {
  const currentPrefix = locale === i18n.defaultLanguage ? "" : `/${locale}`;

  return (
    <footer className="mt-auto border-t border-[var(--track-border)] bg-[var(--track-surface-muted)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Site links */}
          <div className="flex flex-col gap-2 text-[12px]">
            <p className="font-semibold text-[var(--track-text)]">OpenToggl</p>
            <a
              href={`${currentPrefix}/docs`}
              className="text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
            >
              Documentation
            </a>
            <a
              href={`${currentPrefix}/docs/self-hosting`}
              className="text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
            >
              Self-Hosting Guide
            </a>
            <a
              href="https://github.com/CorrectRoadH/opentoggl"
              className="text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>

          {/* Language links — real <a> tags for crawlability */}
          <nav aria-label="Language" className="flex flex-col gap-2 text-[12px]">
            <p className="font-semibold text-[var(--track-text)]">Language</p>
            {i18n.languages.map((lang) => {
              const isDefault = lang === i18n.defaultLanguage;
              const href = isDefault ? "/" : `/${lang}`;
              const isCurrent = lang === locale;
              return (
                <a
                  key={lang}
                  href={href}
                  className={`${isCurrent ? "text-[var(--track-accent-text)] font-medium" : "text-[var(--track-text-muted)] hover:text-[var(--track-text)]"}`}
                  {...(isCurrent ? { "aria-current": "true" as const } : {})}
                >
                  {languageNames[lang] ?? lang}
                </a>
              );
            })}
          </nav>
        </div>

        <p className="mt-6 text-[11px] text-[var(--track-text-muted)]">
          © {new Date().getFullYear()} OpenToggl. Open-source time tracking.
        </p>
      </div>
    </footer>
  );
}
