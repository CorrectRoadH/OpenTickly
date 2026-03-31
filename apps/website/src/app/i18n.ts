import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

export const supportedLanguages = ["en", "zh"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageLabels: Record<SupportedLanguage, string> = {
  en: "English",
  zh: "中文",
};

/**
 * Normalizes a language code from the backend or i18n library into one of the
 * supported language values. Falls back to "en" when the input is not recognized.
 */
export function normalizeSupportedLanguage(language: string | null | undefined): SupportedLanguage {
  if (language && supportedLanguages.includes(language as SupportedLanguage)) {
    return language as SupportedLanguage;
  }
  return "en";
}

void i18n
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`),
    ),
  )
  .init({
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    interpolation: { escapeValue: false },
  });

export default i18n;
