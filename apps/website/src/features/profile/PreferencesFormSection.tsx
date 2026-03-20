import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useForm } from "react-hook-form";
import { type ReactElement } from "react";

import {
  mapPreferencesFormToRequest,
  type PreferencesFormValues,
} from "../../shared/forms/profile-form.ts";

type PreferencesFormSectionProps = {
  initialValues: PreferencesFormValues;
  onSubmit: (request: ReturnType<typeof mapPreferencesFormToRequest>) => Promise<void> | void;
};

export function PreferencesFormSection({
  initialValues,
  onSubmit,
}: PreferencesFormSectionProps): ReactElement {
  const form = useForm<PreferencesFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="bg-white/95">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapPreferencesFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Preferences</h2>
          <p className="text-sm leading-6 text-slate-600">
            Preferences stay on the dedicated profile page because they belong to the user, not the
            current workspace.
          </p>
        </div>

        <Field label="Date format">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("dateFormat")}
          />
        </Field>
        <Field label="Timezone">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("timezone")}
          />
        </Field>
        <Field label="Language code">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("languageCode")}
          />
        </Field>

        <AppButton type="submit">Save preferences</AppButton>
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
