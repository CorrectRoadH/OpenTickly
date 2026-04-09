import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { languageLabels, supportedLanguages, type SupportedLanguage } from "../../app/i18n.ts";

export function AuthLanguageSwitcher(): ReactElement {
  const { i18n } = useTranslation();

  function handleChange(language: SupportedLanguage) {
    void i18n.changeLanguage(language);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] text-[var(--track-text-muted)]">
      {supportedLanguages.map((lang, index) => (
        <span key={lang} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">·</span>}
          <button
            className={`transition-colors hover:text-[var(--track-accent-text)] ${
              i18n.language === lang ? "font-semibold text-[var(--track-accent-text)]" : ""
            }`}
            onClick={() => handleChange(lang)}
            type="button"
          >
            {languageLabels[lang]}
          </button>
        </span>
      ))}
    </div>
  );
}
