import { AppInlineNotice, AppPanel, AppSurfaceState } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Page } from "../../app/Page.tsx";
import { OrganizationSettingsForm } from "../../features/settings/OrganizationSettingsForm.tsx";
import { createOrganizationSettingsFormValues } from "../../shared/forms/settings-form.ts";
import {
  useDeleteOrganizationMutation,
  useOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "../../shared/query/web-shell.ts";

type OrganizationSettingsPageProps = {
  organizationId: number;
};

export function OrganizationSettingsPage({
  organizationId,
}: OrganizationSettingsPageProps): ReactElement {
  const navigate = useNavigate();
  const organizationQuery = useOrganizationSettingsQuery(organizationId);
  const updateMutation = useUpdateOrganizationSettingsMutation(organizationId);
  const deleteMutation = useDeleteOrganizationMutation(organizationId);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                label="Organization"
                value={organizationQuery.data.name ?? "Unnamed org"}
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

        <AppPanel className="border-red-500/30" data-testid="delete-organization-section">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-400">Delete organization</h2>
              <p className="text-sm leading-6 text-slate-400">
                Permanently delete this organization and all its workspaces, projects, time entries,
                and data. This action cannot be undone.
              </p>
            </div>
            <label className="block">
              <span className="text-sm text-slate-400">
                Type{" "}
                <span className="font-mono font-semibold text-white">
                  {organizationQuery.data.name}
                </span>{" "}
                to confirm
              </span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-3 text-sm text-white outline-none transition focus:border-red-500"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={organizationQuery.data.name ?? ""}
                type="text"
                value={deleteConfirmation}
              />
            </label>
            <button
              className="inline-flex h-10 items-center rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
              disabled={
                deleteConfirmation !== organizationQuery.data.name || deleteMutation.isPending
              }
              onClick={async () => {
                try {
                  await deleteMutation.mutateAsync();
                  void navigate({ to: "/" });
                } catch {
                  setError("Could not delete organization");
                }
              }}
              type="button"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete this organization"}
            </button>
          </div>
        </AppPanel>
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
