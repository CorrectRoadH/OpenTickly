import { AppPanel } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";

import { WorkspaceSettingsForm } from "../../features/settings/WorkspaceSettingsForm.tsx";
import { createWorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import {
  buildOrganizationSettingsPath,
  buildWorkspaceSettingsPathWithSection,
} from "../../shared/lib/workspace-routing.ts";
import {
  useWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
} from "../../shared/query/web-shell.ts";
import type { WorkspaceSettingsSection } from "../../shared/url-state/workspace-settings-location.ts";

type WorkspaceSettingsPageProps = {
  section: WorkspaceSettingsSection;
  workspaceId: number;
};

export function WorkspaceSettingsPage({
  section,
  workspaceId,
}: WorkspaceSettingsPageProps): ReactElement {
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceSettingsMutation(workspaceId);
  const [status, setStatus] = useState<string | null>(null);

  if (settingsQuery.isPending || !settingsQuery.data) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm font-medium text-slate-700">Loading workspace settings…</p>
      </AppPanel>
    );
  }

  const organizationId =
    settingsQuery.data.organization?.id ?? settingsQuery.data.workspace.organization_id ?? 0;

  return (
    <div className="space-y-4">
      <AppPanel className="bg-white/95">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Workspace settings
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Tenant defaults, branding, and related billing context live here without merging into
              the profile page.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
            to={buildOrganizationSettingsPath(organizationId)}
          >
            Organization settings
          </Link>
        </div>
      </AppPanel>

      <AppPanel className="bg-white/95">
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
            to={buildWorkspaceSettingsPathWithSection(workspaceId, "general")}
          >
            General
          </Link>
          <Link
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
            to={buildWorkspaceSettingsPathWithSection(workspaceId, "branding")}
          >
            Branding
          </Link>
        </div>
      </AppPanel>

      {section === "branding" ? (
        <AppPanel className="bg-white/95">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Branding assets
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Reach logo and avatar management from the settings surface even before upload tooling
              lands in later waves.
            </p>
          </div>
        </AppPanel>
      ) : null}

      {status ? (
        <AppPanel className="border-emerald-200 bg-emerald-50/80">
          <p className="text-sm font-semibold text-emerald-800">{status}</p>
        </AppPanel>
      ) : null}
      <WorkspaceSettingsForm
        brandingHref={buildWorkspaceSettingsPathWithSection(workspaceId, "branding")}
        initialValues={createWorkspaceSettingsFormValues(settingsQuery.data.workspace)}
        onSubmit={async (request) => {
          await updateMutation.mutateAsync(request);
          setStatus("Workspace settings saved");
        }}
      />
    </div>
  );
}
