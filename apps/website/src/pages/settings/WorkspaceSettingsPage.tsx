import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
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
  const [error, setError] = useState<string | null>(null);

  if (settingsQuery.isPending) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-white/10 bg-[#18181c] text-slate-300"
          description="Fetching workspace defaults, branding, and policy settings."
          title="Loading workspace settings"
          tone="loading"
        />
      </AppPanel>
    );
  }

  if (settingsQuery.isError) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-rose-500/30 bg-[#23181b] text-rose-200"
          description="We could not load workspace settings right now. Refresh or try again shortly."
          title="Workspace settings unavailable"
          tone="error"
        />
      </AppPanel>
    );
  }

  if (!settingsQuery.data) {
    return (
      <AppPanel className="border-white/8 bg-[#1f1f23]">
        <AppSurfaceState
          className="border-white/10 bg-[#18181c] text-slate-300"
          description="No workspace settings data was returned for this workspace."
          title="Workspace settings unavailable"
          tone="empty"
        />
      </AppPanel>
    );
  }

  const organizationId = settingsQuery.data.workspace.organization_id ?? 0;
  const workspace = settingsQuery.data.workspace;
  const preferences = settingsQuery.data.preferences;

  return (
    <div className="space-y-4" data-testid="workspace-settings-page">
      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="workspace-settings-header">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white">Workspace settings</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-400">
                Manage workspace defaults, branding, and member-facing behavior for the current
                workspace.
              </p>
            </div>
            <Link
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/8"
              to={buildOrganizationSettingsPath(organizationId)}
            >
              Organization settings
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Workspace"
              value={workspace.name ?? `Workspace ${workspaceId}`}
            />
            <SummaryCard label="Currency" value={workspace.default_currency ?? "USD"} />
            <SummaryCard
              label="Timesheet view"
              value={preferences.show_timesheet_view ? "Enabled" : "Hidden"}
            />
          </div>
        </div>
      </AppPanel>

      <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="workspace-settings-tabs">
        <div className="flex flex-wrap gap-3">
          <a
            className={sectionLinkClass(section === "general")}
            href={buildWorkspaceSettingsPathWithSection(workspaceId, "general")}
          >
            General
          </a>
          <a
            className={sectionLinkClass(section === "branding")}
            href={buildWorkspaceSettingsPathWithSection(workspaceId, "branding")}
          >
            Branding
          </a>
        </div>
      </AppPanel>

      {section === "branding" ? (
        <AppPanel
          className="border-white/8 bg-[#1f1f23]"
          data-testid="workspace-settings-branding-panel"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Branding assets</h2>
            <p className="text-sm leading-6 text-slate-400">
              Keep workspace logo and avatar entry points with the rest of the workspace settings
              surface.
            </p>
            <div className="rounded-xl border border-white/10 bg-[#18181c] p-4">
              <p className="text-xs font-medium uppercase text-slate-500">Current logo URL</p>
              <p className="mt-2 break-all text-sm text-slate-300">
                {workspace.logo_url ?? "No logo configured yet."}
              </p>
            </div>
          </div>
        </AppPanel>
      ) : null}

      {status ? (
        <AppInlineNotice className="border-white/10 bg-[#18181c] text-[#dface3]" tone="success">
          {status}
        </AppInlineNotice>
      ) : null}
      {error ? (
        <AppInlineNotice className="border-rose-500/30 bg-[#23181b] text-rose-200" tone="error">
          {error}
        </AppInlineNotice>
      ) : null}
      <WorkspaceSettingsForm
        brandingHref={buildWorkspaceSettingsPathWithSection(workspaceId, "branding")}
        initialValues={createWorkspaceSettingsFormValues(settingsQuery.data)}
        onSubmit={async (request) => {
          try {
            await updateMutation.mutateAsync(request);
            setStatus("Workspace settings saved");
            setError(null);
          } catch {
            setError("Could not save workspace settings");
            setStatus(null);
          }
        }}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-[#18181c] p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function sectionLinkClass(isActive: boolean): string {
  return `rounded-lg border px-4 py-2 text-sm font-medium ${
    isActive
      ? "border-[#8c5495] bg-[#4d2c52] text-white"
      : "border-white/10 bg-transparent text-slate-300"
  }`;
}
