import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

import { ShellPage } from "../../app/ShellPage.tsx";
import { OrganizationSettingsForm } from "../../features/settings/OrganizationSettingsForm.tsx";
import { createOrganizationSettingsFormValues } from "../../shared/forms/settings-form.ts";
import {
  useOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "../../shared/query/web-shell.ts";

type OrganizationSettingsPageProps = {
  organizationId: number;
};

export function OrganizationSettingsPage({
  organizationId,
}: OrganizationSettingsPageProps): ReactElement {
  const organizationQuery = useOrganizationSettingsQuery(organizationId);
  const updateMutation = useUpdateOrganizationSettingsMutation(organizationId);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (organizationQuery.isPending) {
    return (
      <ShellPage data-testid="organization-settings-page">
        <AppPanel className="border-white/8 bg-[#1f1f23]">
          <AppSurfaceState
            className="border-white/10 bg-[#18181c] text-slate-300"
            description="Fetching organization-level configuration and policy values."
            title="Loading organization settings"
            tone="loading"
          />
        </AppPanel>
      </ShellPage>
    );
  }

  if (organizationQuery.isError) {
    return (
      <ShellPage data-testid="organization-settings-page">
        <AppPanel className="border-white/8 bg-[#1f1f23]">
          <AppSurfaceState
            className="border-rose-500/30 bg-[#23181b] text-rose-200"
            description="We could not load organization settings right now. Refresh or try again shortly."
            title="Organization settings unavailable"
            tone="error"
          />
        </AppPanel>
      </ShellPage>
    );
  }

  if (!organizationQuery.data) {
    return (
      <ShellPage data-testid="organization-settings-page">
        <AppPanel className="border-white/8 bg-[#1f1f23]">
          <AppSurfaceState
            className="border-white/10 bg-[#18181c] text-slate-300"
            description="No organization settings data was returned for this organization."
            title="Organization settings unavailable"
            tone="empty"
          />
        </AppPanel>
      </ShellPage>
    );
  }

  return (
    <ShellPage data-testid="organization-settings-page">
      <div className="space-y-4">
        <AppPanel
          className="border-white/8 bg-[#1f1f23]"
          data-testid="organization-settings-header"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white">Organization settings</h1>
              <p className="text-sm leading-6 text-slate-400">
                Manage organization-wide governance and settings that apply across workspaces.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Organization"
                value={organizationQuery.data.name ?? "Unnamed org"}
              />
              <SummaryCard
                label="Plan"
                value={organizationQuery.data.pricing_plan_name ?? "Free"}
              />
              <SummaryCard label="Members" value={String(organizationQuery.data.user_count ?? 0)} />
            </div>
          </div>
        </AppPanel>

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
        <OrganizationSettingsForm
          initialValues={createOrganizationSettingsFormValues(organizationQuery.data)}
          onSubmit={async (request) => {
            try {
              await updateMutation.mutateAsync(request);
              setStatus("Organization saved");
              setError(null);
            } catch {
              setError("Could not save organization settings");
              setStatus(null);
            }
          }}
        />
      </div>
    </ShellPage>
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
