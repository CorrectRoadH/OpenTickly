import { describe, expect, it } from "vitest";

import {
  createPreferencesFormValues,
  createProfileFormValues,
  mapPreferencesFormToRequest,
  mapProfileFormToRequest,
} from "../profile-form.ts";

describe("profile form adapters", () => {
  it("creates profile defaults from the current user contract and omits blank password updates", () => {
    const values = createProfileFormValues({
      id: 99,
      email: "alex@example.com",
      fullname: "Alex North",
      api_token: "api-token-99",
      timezone: "Europe/Tallinn",
      beginning_of_week: 1,
      country_id: 70,
      default_workspace_id: 202,
      has_password: true,
      "2fa_enabled": false,
    });

    expect(values).toEqual({
      email: "alex@example.com",
      fullName: "Alex North",
      timezone: "Europe/Tallinn",
      beginningOfWeek: 1,
      countryId: 70,
      defaultWorkspaceId: 202,
      currentPassword: "",
      newPassword: "",
    });

    expect(
      mapProfileFormToRequest({
        ...values,
        fullName: "Alexandra North",
      }),
    ).toEqual({
      email: "alex@example.com",
      fullname: "Alexandra North",
      timezone: "Europe/Tallinn",
      beginning_of_week: 1,
      country_id: 70,
      default_workspace_id: 202,
    });
  });

  it("includes password fields only when both are present", () => {
    expect(
      mapProfileFormToRequest({
        email: "alex@example.com",
        fullName: "Alex North",
        timezone: "Europe/Tallinn",
        beginningOfWeek: 1,
        countryId: 70,
        defaultWorkspaceId: 202,
        currentPassword: "old-secret",
        newPassword: "new-secret",
      }),
    ).toEqual({
      email: "alex@example.com",
      fullname: "Alex North",
      timezone: "Europe/Tallinn",
      beginning_of_week: 1,
      country_id: 70,
      default_workspace_id: 202,
      current_password: "old-secret",
      password: "new-secret",
    });
  });

  it("creates preference defaults and maps them back to the contract fields", () => {
    const values = createPreferencesFormValues({
      date_format: "YYYY-MM-DD",
      timeofday_format: "h:mm a",
      duration_format: "improved",
      pg_time_zone_name: "Europe/Tallinn",
      beginningOfWeek: 1,
      collapseTimeEntries: true,
      language_code: "en-US",
      hide_sidebar_right: false,
      reports_collapse: true,
      manualMode: false,
      manualEntryMode: "timer",
    });

    expect(values).toEqual({
      dateFormat: "YYYY-MM-DD",
      durationFormat: "improved",
      timezone: "Europe/Tallinn",
      beginningOfWeek: 1,
      collapseTimeEntries: true,
      languageCode: "en-US",
      hideSidebarRight: false,
      reportsCollapse: true,
      manualMode: false,
      manualEntryMode: "timer",
      timeofdayFormat: "h:mm a",
    });

    expect(mapPreferencesFormToRequest(values)).toEqual({
      date_format: "YYYY-MM-DD",
      duration_format: "improved",
      pg_time_zone_name: "Europe/Tallinn",
      beginningOfWeek: 1,
      collapseTimeEntries: true,
      language_code: "en-US",
      hide_sidebar_right: false,
      reports_collapse: true,
      manualMode: false,
      manualEntryMode: "timer",
      timeofday_format: "h:mm a",
    });
  });
});
