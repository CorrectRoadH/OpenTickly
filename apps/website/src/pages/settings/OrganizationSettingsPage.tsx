import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

import { Page } from "../../app/Page.tsx";
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
      <Page data-testid="organization-settings-page">
        <AppPanel tone="muted">
          <AppSurfaceState
            description="Fetching organization-level configuration and policy values."
            title="Loading organization settings"
            tone="loading"
          />
        </AppPanel>
      </Page>
    );
  }

  if (organizationQuery.isError) {
    return (
      <Page data-testid="organization-settings-page">
        <AppPanel tone="muted">
          <AppSurfaceState
            description="We could not load organization settings right now. Refresh or try again shortly."
            title="Organization settings unavailable"
            tone="error"
          />
        </AppPanel>
      </Page>
    );
  }

  if (!organizationQuery.data) {
    return (
      <Page data-testid="organization-settings-page">
        <AppPanel tone="muted">
          <AppSurfaceState
            description="No organization settings data was returned for this organization."
            title="Organization settings unavailable"
            tone="empty"
          />
        </AppPanel>
      </Page>
    );
  }

  return (
    <Page data-testid="organization-settings-page">
      <div className="space-y-4">
        <AppPanel className="border-white/8" data-testid="organization-settings-header">
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

        {status ? <AppInlineNotice tone="success">{status}</AppInlineNotice> : null}
        {error ? <AppInlineNotice tone="error">{error}</AppInlineNotice> : null}
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
    </Page>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
