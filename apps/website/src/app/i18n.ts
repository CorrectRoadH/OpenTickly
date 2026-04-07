import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

import account from "../locales/en/account.json";
import appShell from "../locales/en/appShell.json";
import mobile from "../locales/en/mobile.json";
import auditLog from "../locales/en/auditLog.json";
import auth from "../locales/en/auth.json";
import billableRates from "../locales/en/billableRates.json";
import clients from "../locales/en/clients.json";
import common from "../locales/en/common.json";
import groups from "../locales/en/groups.json";
import instanceAdmin from "../locales/en/instanceAdmin.json";
import members from "../locales/en/members.json";
import navigation from "../locales/en/navigation.json";
import onboarding from "../locales/en/onboarding.json";
import profile from "../locales/en/profile.json";
import projects from "../locales/en/projects.json";
import reports from "../locales/en/reports.json";
import settings from "../locales/en/settings.json";
import subscription from "../locales/en/subscription.json";
import tags from "../locales/en/tags.json";
import tasks from "../locales/en/tasks.json";
import toast from "../locales/en/toast.json";
import tracking from "../locales/en/tracking.json";

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
    ns: [
      "account",
      "appShell",
      "auditLog",
      "auth",
      "billableRates",
      "clients",
      "common",
      "groups",
      "instanceAdmin",
      "members",
      "mobile",
      "navigation",
      "onboarding",
      "profile",
      "projects",
      "reports",
      "settings",
      "subscription",
      "tags",
      "tasks",
      "toast",
      "tracking",
    ],
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        account,
        appShell,
        auditLog,
        auth,
        billableRates,
        clients,
        common,
        groups,
        instanceAdmin,
        members,
        mobile,
        navigation,
        onboarding,
        profile,
        projects,
        reports,
        settings,
        subscription,
        tags,
        tasks,
        toast,
        tracking,
      },
    },
    partialBundledLanguages: true,
  });

export default i18n;
