import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";

import {
  mapOrganizationSettingsFormToRequest,
  type OrganizationSettingsFormValues,
} from "../../shared/forms/settings-form.ts";

type OrganizationSettingsFormProps = {
  initialValues: OrganizationSettingsFormValues;
  onSubmit: (
    request: ReturnType<typeof mapOrganizationSettingsFormToRequest>,
  ) => Promise<void> | void;
};

const fieldClassName =
  "rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white";

export function OrganizationSettingsForm({
  initialValues,
  onSubmit,
}: OrganizationSettingsFormProps): ReactElement {
  const form = useForm<OrganizationSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel data-testid="organization-settings-form" tone="muted">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapOrganizationSettingsFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Organization</h2>
          <p className="text-sm leading-6 text-slate-400">
            Organization settings stay separate so cross-workspace governance does not get folded
            into the workspace form.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Members" value={String(initialValues.userCount)} />
          <SummaryCard
            label="Multi-workspace"
            value={initialValues.isMultiWorkspaceEnabled ? "Enabled" : "Disabled"}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
            Organization name
            <input className={fieldClassName} {...form.register("name")} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
            Max workspaces
            <input className={fieldClassName} readOnly value={form.watch("maxWorkspaces")} />
          </label>
        </div>

        <AppButton type="submit">Save organization</AppButton>
      </form>
    </AppPanel>
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
