import { z } from "zod";

const workspaceSettingsSectionSchema = z.enum([
  "general",
  "billable-rates",
  "csv-import",
  "data-export",
  "single-sign-on",
  "activity",
  "audit-log",
]);

export type WorkspaceSettingsSection = z.infer<typeof workspaceSettingsSectionSchema>;

export type LegacyWorkspaceSettingsSearch = {
  section?: string;
};

export function normalizeWorkspaceSettingsSection(
  section: string | undefined,
): WorkspaceSettingsSection {
  if (section === "branding") {
    return "general";
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
