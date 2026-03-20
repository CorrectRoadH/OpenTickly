import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { useForm } from "react-hook-form";
import { type ReactElement } from "react";

import {
  mapProfileFormToRequest,
  type ProfileFormValues,
} from "../../shared/forms/profile-form.ts";

type ProfileFormSectionProps = {
  initialValues: ProfileFormValues;
  onSubmit: (request: ReturnType<typeof mapProfileFormToRequest>) => Promise<void> | void;
};

export function ProfileFormSection({
  initialValues,
  onSubmit,
}: ProfileFormSectionProps): ReactElement {
  const form = useForm<ProfileFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="bg-white/95">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapProfileFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Account details</h2>
          <p className="text-sm leading-6 text-slate-600">
            Keep the current user profile separate from workspace settings so the shell matches
            Toggl’s account boundary.
          </p>
        </div>

        <Field label="Full name">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("fullName")}
          />
        </Field>
        <Field label="Email">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            type="email"
            {...form.register("email")}
          />
        </Field>
        <Field label="Timezone">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            {...form.register("timezone")}
          />
        </Field>

        <AppButton type="submit">Save profile</AppButton>
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
