import { z } from "zod";

import type {
  MePayload,
  ModelsAllPreferences,
  RelatedUserWithRelated,
} from "../api/generated/public-track/types.gen.ts";

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
  timezone: z.string().min(1),
  beginningOfWeek: z.number().int().min(0).max(6),
  collapseTimeEntries: z.boolean(),
  languageCode: z.string().min(1),
  hideSidebarRight: z.boolean(),
  reportsCollapse: z.boolean(),
  manualMode: z.boolean(),
  manualEntryMode: z.string().min(1),
  timeofdayFormat: z.string().min(1),
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

export function mapProfileFormToRequest(
  values: ProfileFormValues,
): MePayload {
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
  preferences: ModelsAllPreferences,
): PreferencesFormValues {
  const extraPreferences = preferences as Record<string, unknown>;

  return {
    dateFormat: preferences.date_format ?? "YYYY-MM-DD",
    durationFormat: preferences.duration_format ?? "improved",
    timezone: preferences.pg_time_zone_name ?? "UTC",
    beginningOfWeek: preferences.beginningOfWeek ?? 1,
    collapseTimeEntries: preferences.collapseTimeEntries ?? false,
    languageCode:
      typeof extraPreferences["language_code"] === "string"
        ? (extraPreferences["language_code"] as string)
        : "en-US",
    hideSidebarRight: preferences.hide_sidebar_right ?? false,
    reportsCollapse:
      typeof extraPreferences["reports_collapse"] === "boolean"
        ? (extraPreferences["reports_collapse"] as boolean)
        : false,
    manualMode: preferences.manualMode ?? false,
    manualEntryMode: preferences.manualEntryMode ?? "timer",
    timeofdayFormat: preferences.timeofday_format ?? "h:mm a",
  };
}

export function mapPreferencesFormToRequest(
  values: PreferencesFormValues,
): ModelsAllPreferences {
  const parsed = preferencesFormSchema.parse(values);
  const request: ModelsAllPreferences = {
    date_format: parsed.dateFormat,
    duration_format: parsed.durationFormat,
    pg_time_zone_name: parsed.timezone,
    beginningOfWeek: parsed.beginningOfWeek,
    collapseTimeEntries: parsed.collapseTimeEntries,
    hide_sidebar_right: parsed.hideSidebarRight,
    manualMode: parsed.manualMode,
    manualEntryMode: parsed.manualEntryMode,
    timeofday_format: parsed.timeofdayFormat,
  };

  const extraRequest = request as Record<string, unknown>;
  extraRequest["language_code"] = parsed.languageCode;
  extraRequest["reports_collapse"] = parsed.reportsCollapse;

  return request;
}
