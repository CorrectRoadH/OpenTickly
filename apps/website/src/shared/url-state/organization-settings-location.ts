import { z } from "zod";

const organizationSettingsSectionSchema = z.enum(["general", "members", "groups", "danger"]);

export type OrganizationSettingsSection = z.infer<typeof organizationSettingsSectionSchema>;

export function normalizeOrganizationSettingsSection(
  section: string | undefined,
): OrganizationSettingsSection {
  return organizationSettingsSectionSchema.catch("general").parse(section);
}

export function buildOrganizationSettingsPath(input: {
  organizationId: number;
  section?: OrganizationSettingsSection;
}): string {
  return `/organizations/${input.organizationId}/settings/${input.section ?? "general"}`;
}
