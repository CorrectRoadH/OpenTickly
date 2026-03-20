import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useForm } from "react-hook-form";
import { type ReactElement } from "react";

import {
  mapWorkspaceSettingsFormToRequest,
  type WorkspaceSettingsFormValues,
} from "../../shared/forms/settings-form.ts";

type WorkspaceSettingsFormProps = {
  brandingHref: string;
  initialValues: WorkspaceSettingsFormValues;
  onSubmit: (request: ReturnType<typeof mapWorkspaceSettingsFormToRequest>) => Promise<void> | void;
};

export function WorkspaceSettingsForm({
  brandingHref,
  initialValues,
  onSubmit,
}: WorkspaceSettingsFormProps): ReactElement {
  const form = useForm<WorkspaceSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="bg-white/95">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapWorkspaceSettingsFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">General</h2>
          <p className="text-sm leading-6 text-slate-600">
            Workspace defaults here flow into tracking and reports behavior, so they stay in the
            tenant settings surface instead of the profile page.
          </p>
        </div>

        <Field label="Workspace name">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("name")}
          />
        </Field>
        <Field label="Default currency">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("defaultCurrency")}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <AppButton type="submit">Save workspace settings</AppButton>
          <a
            className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
            href={brandingHref}
          >
            Manage logo and avatar
          </a>
        </div>
      </form>
    </AppPanel>
  );
}

function Field(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {props.label}
      {props.children}
    </label>
  );
}
