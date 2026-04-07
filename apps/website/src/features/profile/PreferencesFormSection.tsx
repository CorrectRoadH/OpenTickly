import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  mapPreferencesFormToRequest,
  type PreferencesFormValues,
} from "../../shared/forms/profile-form.ts";

type PreferencesFormSectionProps = {
  initialValues: PreferencesFormValues;
  onSubmit: (request: ReturnType<typeof mapPreferencesFormToRequest>) => Promise<void> | void;
};

const fieldClassName =
  "rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white";

export function PreferencesFormSection({
  initialValues,
  onSubmit,
}: PreferencesFormSectionProps): ReactElement {
  const { t } = useTranslation("profile");
  const form = useForm<PreferencesFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel data-testid="preferences-form-section" tone="muted">
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapPreferencesFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">{t("preferencesSectionTitle")}</h2>
          <p className="text-sm leading-6 text-slate-400">{t("preferencesSectionDescription")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("dateFormat")}>
            <input className={fieldClassName} {...form.register("dateFormat")} />
          </Field>
          <Field label={t("durationDisplayFormat")}>
            <input className={fieldClassName} {...form.register("durationFormat")} />
          </Field>
          <Field label={t("timeOfDayFormat")}>
            <input className={fieldClassName} {...form.register("timeofdayFormat")} />
          </Field>
          <Field label={t("manualEntryMode")}>
            <input className={fieldClassName} {...form.register("manualEntryMode")} />
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

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleField label={t("collapseTimeEntries")}>
            <input type="checkbox" {...form.register("collapseTimeEntries")} />
          </ToggleField>
          <ToggleField label={t("showGoalsView")}>
            <input type="checkbox" {...form.register("isGoalsViewShown")} />
          </ToggleField>
          <ToggleField label={t("keyboardShortcutsEnabledLabel")}>
            <input type="checkbox" {...form.register("keyboardShortcutsEnabled")} />
          </ToggleField>
          <ToggleField label={t("showRunningTimeInTitle")}>
            <input type="checkbox" {...form.register("showTimeInTitle")} />
          </ToggleField>
        </div>

        <AppButton type="submit">{t("savePreferences")}</AppButton>
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

function ToggleField(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-sm font-medium text-slate-300">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
