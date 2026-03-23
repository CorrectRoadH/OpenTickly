import { z } from "zod";

import type { MePayload, RelatedUserWithRelated } from "../api/generated/public-track/types.gen.ts";
import type { ProfilePreferencesDto } from "../query/web-shell.ts";

export const profileFormSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  timezone: z.string().min(1),
  beginningOfWeek: z.number().int().min(0).max(6),
  countryId: z.number().int().nonnegative(),
  defaultWorkspaceId: z.number().int().nonnegative(),
  currentPassword: z.string(),
  newPassword: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const preferencesFormSchema = z.object({
  dateFormat: z.string().min(1),
  durationFormat: z.string().min(1),
  beginningOfWeek: z.number().int().min(0).max(6),
  collapseTimeEntries: z.boolean(),
  isGoalsViewShown: z.boolean(),
  keyboardShortcutsEnabled: z.boolean(),
  projectShortcutEnabled: z.boolean(),
  sendAddedToProjectNotification: z.boolean(),
  sendDailyProjectInvites: z.boolean(),
  sendProductEmails: z.boolean(),
  sendProductReleaseNotification: z.boolean(),
  sendTimerNotifications: z.boolean(),
  sendWeeklyReport: z.boolean(),
  showAnimations: z.boolean(),
  showTimeInTitle: z.boolean(),
  tagsShortcutEnabled: z.boolean(),
  timeofdayFormat: z.string().min(1),
  manualEntryMode: z.string().min(1),
});

export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export function createProfileFormValues(profile: RelatedUserWithRelated): ProfileFormValues {
  return {
    email: profile.email ?? "",
    fullName: profile.fullname ?? "",
    timezone: profile.timezone ?? "",
    beginningOfWeek: profile.beginning_of_week ?? 1,
    countryId: profile.country_id ?? 0,
    defaultWorkspaceId: profile.default_workspace_id ?? 0,
    currentPassword: "",
    newPassword: "",
  };
}

export function mapProfileFormToRequest(values: ProfileFormValues): MePayload {
  const parsed = profileFormSchema.parse(values);
  const request: MePayload = {
    email: parsed.email,
    fullname: parsed.fullName,
    timezone: parsed.timezone,
    beginning_of_week: parsed.beginningOfWeek,
    country_id: parsed.countryId,
    default_workspace_id: parsed.defaultWorkspaceId,
  };

  // Toggl-style profile updates should not send blank password fields, otherwise the
  // shell would look like it is changing credentials on every profile save.
  if (parsed.currentPassword && parsed.newPassword) {
    request.current_password = parsed.currentPassword;
    request.password = parsed.newPassword;
  }

  return request;
}

export function createPreferencesFormValues(
  preferences: ProfilePreferencesDto,
): PreferencesFormValues {
  return {
    dateFormat: preferences.date_format ?? "YYYY-MM-DD",
    durationFormat: preferences.duration_format ?? "improved",
    beginningOfWeek: preferences.beginningOfWeek ?? 1,
    collapseTimeEntries: preferences.collapseTimeEntries ?? false,
    isGoalsViewShown: preferences.is_goals_view_shown ?? true,
    keyboardShortcutsEnabled: preferences.keyboard_shortcuts_enabled ?? true,
    projectShortcutEnabled: preferences.project_shortcut_enabled ?? false,
    sendAddedToProjectNotification: preferences.send_added_to_project_notification ?? true,
    sendDailyProjectInvites: preferences.send_daily_project_invites ?? true,
    sendProductEmails: preferences.send_product_emails ?? true,
    sendProductReleaseNotification: preferences.send_product_release_notification ?? true,
    sendTimerNotifications: preferences.send_timer_notifications ?? true,
    sendWeeklyReport: preferences.send_weekly_report ?? true,
    showAnimations: !(preferences.animation_opt_out ?? false),
    showTimeInTitle: preferences.showTimeInTitle ?? true,
    tagsShortcutEnabled: preferences.tags_shortcut_enabled ?? false,
    manualEntryMode: preferences.manualEntryMode ?? "timer",
    timeofdayFormat: preferences.timeofday_format ?? "h:mm a",
  };
}

export function mapPreferencesFormToRequest(values: PreferencesFormValues): ProfilePreferencesDto {
  const parsed = preferencesFormSchema.parse(values);
  return {
    animation_opt_out: !parsed.showAnimations,
    beginningOfWeek: parsed.beginningOfWeek,
    collapseTimeEntries: parsed.collapseTimeEntries,
    date_format: parsed.dateFormat,
    duration_format: parsed.durationFormat,
    is_goals_view_shown: parsed.isGoalsViewShown,
    keyboard_shortcuts_enabled: parsed.keyboardShortcutsEnabled,
    manualEntryMode: parsed.manualEntryMode,
    project_shortcut_enabled: parsed.projectShortcutEnabled,
    send_added_to_project_notification: parsed.sendAddedToProjectNotification,
    send_daily_project_invites: parsed.sendDailyProjectInvites,
    send_product_emails: parsed.sendProductEmails,
    send_product_release_notification: parsed.sendProductReleaseNotification,
    send_timer_notifications: parsed.sendTimerNotifications,
    send_weekly_report: parsed.sendWeeklyReport,
    showTimeInTitle: parsed.showTimeInTitle,
    tags_shortcut_enabled: parsed.tagsShortcutEnabled,
    timeofday_format: parsed.timeofdayFormat,
  };
}
