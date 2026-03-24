import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";

import {
  mapPreferencesFormToRequest,
  type PreferencesFormValues,
} from "../../shared/forms/profile-form.ts";

type PreferencesFormSectionProps = {
  initialValues: PreferencesFormValues;
  onSubmit: (request: ReturnType<typeof mapPreferencesFormToRequest>) => Promise<void> | void;
};

const fieldClassName = "rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white";

export function PreferencesFormSection({
  initialValues,
  onSubmit,
}: PreferencesFormSectionProps): ReactElement {
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
          <h2 className="text-2xl font-semibold text-white">Preferences</h2>
          <p className="text-sm leading-6 text-slate-400">
            Preferences stay on the dedicated profile page because they belong to the user, not the
            current workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Date format">
            <input className={fieldClassName} {...form.register("dateFormat")} />
          </Field>
          <Field label="Duration format">
            <input className={fieldClassName} {...form.register("durationFormat")} />
          </Field>
          <Field label="Time of day format">
            <input className={fieldClassName} {...form.register("timeofdayFormat")} />
          </Field>
          <Field label="Manual entry mode">
            <input className={fieldClassName} {...form.register("manualEntryMode")} />
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

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleField label="Collapse time entries">
            <input type="checkbox" {...form.register("collapseTimeEntries")} />
          </ToggleField>
          <ToggleField label="Show goals view">
            <input type="checkbox" {...form.register("isGoalsViewShown")} />
          </ToggleField>
          <ToggleField label="Keyboard shortcuts enabled">
            <input type="checkbox" {...form.register("keyboardShortcutsEnabled")} />
          </ToggleField>
          <ToggleField label="Show running time in title">
            <input type="checkbox" {...form.register("showTimeInTitle")} />
          </ToggleField>
        </div>

        <AppButton type="submit">Save preferences</AppButton>
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
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-sm font-medium text-slate-300">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
