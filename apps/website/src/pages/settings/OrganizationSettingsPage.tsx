import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";

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
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="Fetching organization-level configuration and policy values."
          title="Loading organization settings"
          tone="loading"
        />
      </AppPanel>
    );
  }

  if (organizationQuery.isError) {
    return (
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="We could not load organization settings right now. Refresh or try again shortly."
          title="Organization settings unavailable"
          tone="error"
        />
      </AppPanel>
    );
  }

  if (!organizationQuery.data) {
    return (
      <AppPanel className="bg-white/95">
        <AppSurfaceState
          description="No organization settings data was returned for this organization."
          title="Organization settings unavailable"
          tone="empty"
        />
      </AppPanel>
    );
  }

  return (
    <div className="space-y-4">
      <AppPanel className="bg-white/95">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Organization settings
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Manage organization-wide governance and settings that apply across workspaces.
          </p>
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
  );
}
