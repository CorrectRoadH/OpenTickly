import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "en",
  languages: ["en", "zh"],
  hideLocale: "default-locale",
  parser: "dir",
});

export type Locale = (typeof i18n.languages)[number];

export function resolveLocale(lang: string | undefined): Locale {
  if (lang && (i18n.languages as readonly string[]).includes(lang)) return lang as Locale;
  return i18n.defaultLanguage;
}
