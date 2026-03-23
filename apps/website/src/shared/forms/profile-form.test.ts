import { describe, expect, it } from "vitest";

import {
  createPreferencesFormValues,
  mapPreferencesFormToRequest,
} from "./profile-form.ts";

describe("profile preferences form mapping", () => {
  it("maps persisted preference payload into form values", () => {
    const values = createPreferencesFormValues({
      animation_opt_out: true,
      beginningOfWeek: 1,
      collapseTimeEntries: true,
      date_format: "YYYY-MM-DD",
      duration_format: "improved",
      is_goals_view_shown: false,
      keyboard_shortcuts_enabled: true,
      manualEntryMode: "timer",
      project_shortcut_enabled: false,
      send_added_to_project_notification: true,
      send_daily_project_invites: false,
      send_product_emails: false,
      send_product_release_notification: true,
      send_timer_notifications: true,
      send_weekly_report: false,
      showTimeInTitle: true,
      tags_shortcut_enabled: false,
      timeofday_format: "HH:mm",
    });

    expect(values.showAnimations).toBe(false);
    expect(values.sendProductEmails).toBe(false);
    expect(values.sendWeeklyReport).toBe(false);
    expect(values.beginningOfWeek).toBe(1);
  });

  it("maps form values into the saved preference payload", () => {
    const request = mapPreferencesFormToRequest({
      beginningOfWeek: 5,
      collapseTimeEntries: true,
      dateFormat: "DD/MM/YYYY",
      durationFormat: "decimal",
      isGoalsViewShown: true,
      keyboardShortcutsEnabled: false,
      manualEntryMode: "timer",
      projectShortcutEnabled: true,
      sendAddedToProjectNotification: true,
      sendDailyProjectInvites: false,
      sendProductEmails: false,
      sendProductReleaseNotification: true,
      sendTimerNotifications: false,
      sendWeeklyReport: true,
      showAnimations: false,
      showTimeInTitle: true,
      tagsShortcutEnabled: true,
      timeofdayFormat: "h:mm A",
    });

    expect(request.animation_opt_out).toBe(true);
    expect(request.date_format).toBe("DD/MM/YYYY");
    expect(request.duration_format).toBe("decimal");
    expect(request.project_shortcut_enabled).toBe(true);
    expect(request.send_product_emails).toBe(false);
    expect(request.tags_shortcut_enabled).toBe(true);
  });
});
