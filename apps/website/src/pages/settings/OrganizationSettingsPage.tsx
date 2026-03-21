import { AppPanel } from "@opentoggl/web-ui";
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

  if (organizationQuery.isPending || !organizationQuery.data) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm font-medium text-slate-700">Loading organization settings…</p>
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

      {status ? (
        <AppPanel className="border-emerald-200 bg-emerald-50/80">
          <p className="text-sm font-semibold text-emerald-800">{status}</p>
        </AppPanel>
      ) : null}
      <OrganizationSettingsForm
        initialValues={createOrganizationSettingsFormValues(organizationQuery.data.organization)}
        onSubmit={async (request) => {
          await updateMutation.mutateAsync(request);
          setStatus("Organization saved");
        }}
      />
    </div>
  );
}
