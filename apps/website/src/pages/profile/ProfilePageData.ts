import type { TFunction } from "i18next";

import type { PreferencesFormValues } from "../../shared/forms/profile-form.ts";

export function figmaTimerPreferences(t: TFunction<"profile">) {
  return [
    { key: "collapseTimeEntries" as const, label: t("groupSimilarTimeEntries") },
    { key: "showTimeInTitle" as const, label: t("showRunningTimeInTitleBar") },
    { key: "showAnimations" as const, label: t("showAnimationsLabel") },
    { key: "isGoalsViewShown" as const, label: t("showGoalsViewLabel") },
  ] satisfies ReadonlyArray<{ key: keyof PreferencesFormValues; label: string }>;
}

export function figmaShortcutPreferences(t: TFunction<"profile">) {
  return [
    {
      helper: t("keyboardShortcutsHelper"),
      key: "keyboardShortcutsEnabled" as const,
      label: t("allowKeyboardShortcuts"),
    },
    {
      key: "projectShortcutEnabled" as const,
      label: t("allowProjectShortcut"),
    },
    {
      key: "tagsShortcutEnabled" as const,
      label: t("allowTagsShortcut"),
    },
  ] satisfies ReadonlyArray<{ helper?: string; key: keyof PreferencesFormValues; label: string }>;
}

export function durationFormatOptions(t: TFunction<"profile">) {
  return [
    { label: t("durationClassic"), value: "classic" },
    { label: t("durationDecimal"), value: "decimal" },
    { label: t("durationImproved"), value: "improved" },
  ];
}

export const dateFormatOptions = [
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
  { label: "MM-DD-YYYY", value: "MM-DD-YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
] as const;

export function timeFormatOptions(t: TFunction<"profile">) {
  return [
    { label: t("timeFormat24Hour"), value: "HH:mm" },
    { label: t("timeFormat12Hour"), value: "h:mm A" },
  ];
}

export function firstDayOfWeekOptions(t: TFunction<"profile">) {
  return [
    { label: t("sunday"), value: 0 },
    { label: t("monday"), value: 1 },
    { label: t("tuesday"), value: 2 },
    { label: t("wednesday"), value: 3 },
    { label: t("thursday"), value: 4 },
    { label: t("friday"), value: 5 },
    { label: t("saturday"), value: 6 },
  ];
}

export const defaultPreferencesFormValues: PreferencesFormValues = {
  beginningOfWeek: 1,
  collapseTimeEntries: true,
  dateFormat: "YYYY-MM-DD",
  durationFormat: "improved",
  isGoalsViewShown: true,
  keyboardShortcutsEnabled: true,
  manualEntryMode: "timer",
  projectShortcutEnabled: false,
  sendAddedToProjectNotification: true,
  sendDailyProjectInvites: true,
  sendProductEmails: true,
  sendProductReleaseNotification: true,
  sendTimerNotifications: true,
  sendWeeklyReport: true,
  showAnimations: true,
  showTimeInTitle: true,
  tagsShortcutEnabled: false,
  timeofdayFormat: "HH:mm",
};
