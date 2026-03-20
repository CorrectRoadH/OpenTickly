import { z } from "zod";

const workspaceSettingsSectionSchema = z.enum(["general", "branding"]);

export type WorkspaceSettingsSection = z.infer<typeof workspaceSettingsSectionSchema>;

export type WorkspaceSettingsSearch = {
  section?: string;
};

export function parseWorkspaceSettingsSearch(search: WorkspaceSettingsSearch | undefined): {
  section: WorkspaceSettingsSection;
} {
  // Unknown sections should collapse to a stable default so deep links keep working
  // even while backend/frontend waves land at different times.
  return {
    section: workspaceSettingsSectionSchema.catch("general").parse(search?.section),
  };
}

export function buildWorkspaceSettingsPath(input: {
  workspaceId: number;
  section: WorkspaceSettingsSection;
}): string {
  const search = new URLSearchParams({
    section: input.section,
  });

  return `/workspaces/${input.workspaceId}/settings?${search.toString()}`;
}
