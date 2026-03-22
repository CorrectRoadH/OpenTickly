import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";

import {
  mapProfileFormToRequest,
  type ProfileFormValues,
} from "../../shared/forms/profile-form.ts";

type ProfileFormSectionProps = {
  initialValues: ProfileFormValues;
  onSubmit: (request: ReturnType<typeof mapProfileFormToRequest>) => Promise<void> | void;
};

const fieldClassName = "rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white";

export function ProfileFormSection({
  initialValues,
  onSubmit,
}: ProfileFormSectionProps): ReactElement {
  const form = useForm<ProfileFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="profile-form-section">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapProfileFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Account details</h2>
          <p className="text-sm leading-6 text-slate-400">
            Keep the current user profile separate from workspace settings so the shell matches
            Toggl’s account boundary.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input className={fieldClassName} {...form.register("fullName")} />
          </Field>
          <Field label="Email">
            <input className={fieldClassName} type="email" {...form.register("email")} />
          </Field>
          <Field label="Timezone">
            <input className={fieldClassName} {...form.register("timezone")} />
          </Field>
          <Field label="Country ID">
            <input
              className={fieldClassName}
              type="number"
              {...form.register("countryId", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Default workspace ID">
            <input
              className={fieldClassName}
              type="number"
              {...form.register("defaultWorkspaceId", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Beginning of week">
            <input
              className={fieldClassName}
              max={6}
              min={0}
              type="number"
              {...form.register("beginningOfWeek", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#18181c] p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Password update</p>
            <p className="text-sm leading-6 text-slate-400">
              Leave both password fields empty to keep the current password unchanged.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Current password">
              <input
                className={fieldClassName}
                type="password"
                {...form.register("currentPassword")}
              />
            </Field>
            <Field label="New password">
              <input className={fieldClassName} type="password" {...form.register("newPassword")} />
            </Field>
          </div>
        </section>

        <AppButton type="submit">Save profile</AppButton>
      </form>
    </AppPanel>
  );
}

function Field(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
      {props.label}
      {props.children}
    </label>
  );
}
