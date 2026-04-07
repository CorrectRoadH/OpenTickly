import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  mapProfileFormToRequest,
  type ProfileFormValues,
} from "../../shared/forms/profile-form.ts";

type ProfileFormSectionProps = {
  initialValues: ProfileFormValues;
  onSubmit: (request: ReturnType<typeof mapProfileFormToRequest>) => Promise<void> | void;
};

const fieldClassName =
  "rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white";

export function ProfileFormSection({
  initialValues,
  onSubmit,
}: ProfileFormSectionProps): ReactElement {
  const { t } = useTranslation("profile");
  const form = useForm<ProfileFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel data-testid="profile-form-section" tone="muted">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapProfileFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">{t("accountDetails")}</h2>
          <p className="text-sm leading-6 text-slate-400">{t("accountDetailsDescription")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("fullName")}>
            <input className={fieldClassName} {...form.register("fullName")} />
          </Field>
          <Field label={t("emailLabel")}>
            <input className={fieldClassName} type="email" {...form.register("email")} />
          </Field>
          <Field label={t("reportsTimezone")}>
            <input className={fieldClassName} {...form.register("timezone")} />
          </Field>
          <Field label={t("countryId")}>
            <input
              className={fieldClassName}
              type="number"
              {...form.register("countryId", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("defaultWorkspaceId")}>
            <input
              className={fieldClassName}
              type="number"
              {...form.register("defaultWorkspaceId", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("firstDayOfWeek")}>
            <input
              className={fieldClassName}
              max={6}
              min={0}
              type="number"
              {...form.register("beginningOfWeek", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <section className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{t("passwordUpdate")}</p>
            <p className="text-sm leading-6 text-slate-400">{t("passwordUpdateDescription")}</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={t("currentPasswordField")}>
              <input
                className={fieldClassName}
                type="password"
                {...form.register("currentPassword")}
              />
            </Field>
            <Field label={t("newPasswordField")}>
              <input className={fieldClassName} type="password" {...form.register("newPassword")} />
            </Field>
          </div>
        </section>

        <AppButton type="submit">{t("saveProfile")}</AppButton>
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
