import type { PreferencesFormValues } from "../../shared/forms/profile-form.ts";

export const figmaEmailPreferences = [
  {
    key: "sendProductEmails",
    label: "Toggl Track can send newsletters by email",
  },
  {
    key: "sendWeeklyReport",
    label: "Weekly overview of tracked time",
  },
  {
    key: "sendTimerNotifications",
    label: "Email about long running (over 8 hours) time entries",
  },
  {
    key: "sendDailyProjectInvites",
    label: "Notify me when I'm added to a new project",
  },
] satisfies ReadonlyArray<{ key: keyof PreferencesFormValues; label: string }>;

export const figmaInAppPreferences = [
  {
    key: "sendAddedToProjectNotification",
    label: "Notify me when I am added to projects and tasks",
    section: "Projects",
  },
  {
    key: "sendProductReleaseNotification",
    label: "Notify me when a new feature is released",
    section: "Product releases",
  },
] as const;

export const figmaTimerPreferences = [
  {
    key: "collapseTimeEntries",
    label: "Group similar time entries",
  },
  {
    key: "showTimeInTitle",
    label: "Show running time in the title bar",
  },
  {
    key: "showAnimations",
    label: "Show animations",
  },
  {
    key: "isGoalsViewShown",
    label: "Show goals view",
  },
] satisfies ReadonlyArray<{ key: keyof PreferencesFormValues; label: string }>;

export const figmaShortcutPreferences = [
  {
    helper: 'Press question mark "?" to see available keyboard shortcuts',
    key: "keyboardShortcutsEnabled",
    label: "Allow using keyboard shortcuts",
  },
  {
    key: "projectShortcutEnabled",
    label: "Allow using @ shortcut to assign a Project in the Timer Description field",
  },
  {
    key: "tagsShortcutEnabled",
    label: "Allow using # shortcut to assign a Tag in the Timer Description field",
  },
] satisfies ReadonlyArray<{ helper?: string; key: keyof PreferencesFormValues; label: string }>;

export const durationFormatOptions = [
  { label: "Classic", value: "classic" },
  { label: "Decimal", value: "decimal" },
  { label: "Improved (0:47:06)", value: "improved" },
] as const;

export const dateFormatOptions = [
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
  { label: "MM-DD-YYYY", value: "MM-DD-YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
] as const;

export const timeFormatOptions = [
  { label: "24-hour", value: "HH:mm" },
  { label: "12-hour", value: "h:mm A" },
] as const;

export const firstDayOfWeekOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
] as const;

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
