import { z } from "zod";

const workspaceSettingsSectionSchema = z.enum([
  "general",
  "alerts",
  "reminders",
  "billable-rates",
  "import",
  "export",
  "sso",
  "activity",
]);

export type WorkspaceSettingsSection = z.infer<typeof workspaceSettingsSectionSchema>;

export type LegacyWorkspaceSettingsSearch = {
  section?: string;
};

const LEGACY_SETTINGS_SLUGS: Record<string, WorkspaceSettingsSection> = {
  branding: "general",
  "csv-import": "import",
  "data-export": "export",
  "single-sign-on": "sso",
};

export function normalizeWorkspaceSettingsSection(
  section: string | undefined,
): WorkspaceSettingsSection {
  if (section && section in LEGACY_SETTINGS_SLUGS) {
    return LEGACY_SETTINGS_SLUGS[section];
  }

  return workspaceSettingsSectionSchema.catch("general").parse(section);
}

export function parseLegacyWorkspaceSettingsSearch(
  search: LegacyWorkspaceSettingsSearch | undefined,
): { section?: string } {
  return {
    section: search?.section,
  };
}

export function buildWorkspaceSettingsPath(input: {
  workspaceId: number;
  section?: WorkspaceSettingsSection;
}): string {
  return `/${input.workspaceId}/settings/${input.section ?? "general"}`;
}
