import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useForm } from "react-hook-form";
import { type ReactElement } from "react";

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

export function OrganizationSettingsForm({
  initialValues,
  onSubmit,
}: OrganizationSettingsFormProps): ReactElement {
  const form = useForm<OrganizationSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="bg-white/95">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapOrganizationSettingsFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Organization</h2>
          <p className="text-sm leading-6 text-slate-600">
            Organization settings stay separate so cross-workspace governance does not get folded
            into the workspace form.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Organization name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("name")}
          />
        </label>

        <AppButton type="submit">Save organization</AppButton>
      </form>
    </AppPanel>
  );
}
