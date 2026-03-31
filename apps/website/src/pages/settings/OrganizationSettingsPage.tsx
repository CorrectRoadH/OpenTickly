import { AppButton, AppSurfaceState, PageHeader, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PreferenceCard } from "../profile/ProfilePagePrimitives.tsx";
import {
  createOrganizationSettingsFormValues,
  mapOrganizationSettingsFormToRequest,
  type OrganizationSettingsFormValues,
} from "../../shared/forms/settings-form.ts";
import {
  useDeleteOrganizationMutation,
  useOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "../../shared/query/web-shell.ts";

type OrganizationSettingsPageProps = {
  organizationId: number;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 text-sm text-white outline-none transition focus:border-[var(--track-accent)]";

export function OrganizationSettingsPage({
  organizationId,
}: OrganizationSettingsPageProps): ReactElement {
  const navigate = useNavigate();
  const organizationQuery = useOrganizationSettingsQuery(organizationId);
  const updateMutation = useUpdateOrganizationSettingsMutation(organizationId);
  const deleteMutation = useDeleteOrganizationMutation(organizationId);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  if (organizationQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Fetching organization-level configuration and policy values."
          title="Loading organization settings"
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (organizationQuery.isError) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent"
          description="We could not load organization settings right now. Refresh or try again shortly."
          title="Organization settings unavailable"
          tone="error"
        />
      </SurfaceCard>
    );
  }

  if (!organizationQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="No organization settings data was returned for this organization."
          title="Organization settings unavailable"
          tone="empty"
        />
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4 pb-6" data-testid="organization-settings-page">
      <section className="sticky top-0 z-10 bg-[var(--track-surface)]">
        <PageHeader bordered title="Organization settings" />
      </section>

      <section className="px-3 pb-10 pt-3 md:flex md:gap-3">
        <div className="w-full space-y-4 md:max-w-[1352px]">
          <OrganizationNameSection
            initialValues={createOrganizationSettingsFormValues(organizationQuery.data)}
            onSubmit={async (request) => {
              try {
                await updateMutation.mutateAsync(request);
                toast.success("Organization saved");
              } catch {
                toast.error("Could not save organization settings");
              }
            }}
          />

          <PreferenceCard title="Overview">
            <div className="px-5 py-4">
              <dl className="space-y-0">
                <div className="flex items-center py-1">
                  <dt className="min-w-[160px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                    Members
                  </dt>
                  <dd className="text-[14px] font-medium leading-5 text-white">
                    {organizationQuery.data.user_count ?? 0}
                  </dd>
                </div>
                <div className="flex items-center py-1">
                  <dt className="min-w-[160px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                    Multi-workspace
                  </dt>
                  <dd className="text-[14px] font-medium leading-5 text-white">
                    {organizationQuery.data.is_multi_workspace_enabled ? "Enabled" : "Disabled"}
                  </dd>
                </div>
                <div className="flex items-center py-1">
                  <dt className="min-w-[160px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
                    Max workspaces
                  </dt>
                  <dd className="text-[14px] font-medium leading-5 text-white">
                    {organizationQuery.data.max_workspaces ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          </PreferenceCard>

          <PreferenceCard title="Danger zone">
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-red-400">Delete organization</h3>
                <p className="text-sm leading-6 text-[var(--track-text-muted)]">
                  Permanently delete this organization and all its workspaces, projects, time
                  entries, and data. This action cannot be undone.
                </p>
              </div>
              <label className="block">
                <span className="text-sm text-[var(--track-text-muted)]">
                  Type{" "}
                  <span className="font-mono font-semibold text-white">
                    {organizationQuery.data.name}
                  </span>{" "}
                  to confirm
                </span>
                <input
                  className={`mt-2 ${fieldClassName} focus:border-red-500`}
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
                    toast.error("Could not delete organization");
                  }
                }}
                type="button"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete this organization"}
              </button>
            </div>
          </PreferenceCard>
        </div>
      </section>
    </div>
  );
}

function OrganizationNameSection({
  initialValues,
  onSubmit,
}: {
  initialValues: OrganizationSettingsFormValues;
  onSubmit: (request: ReturnType<typeof mapOrganizationSettingsFormToRequest>) => Promise<void>;
}): ReactElement {
  const form = useForm<OrganizationSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <PreferenceCard
      action={
        <AppButton
          disabled={!form.formState.isDirty}
          onClick={form.handleSubmit(async (values) => {
            await onSubmit(mapOrganizationSettingsFormToRequest(values));
            form.reset(values);
          })}
          type="button"
        >
          Save
        </AppButton>
      }
      description="Change your organization name"
      title="General"
    >
      <div className="px-5 py-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
            Organization name
          </span>
          <input className={`mt-2 ${fieldClassName}`} {...form.register("name")} />
        </label>
      </div>
    </PreferenceCard>
  );
}
