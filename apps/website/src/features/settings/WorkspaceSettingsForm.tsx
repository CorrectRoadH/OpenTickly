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
        <Field label="Default hourly rate">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            step="0.01"
            type="number"
            {...form.register("defaultHourlyRate", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Rounding mode">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            type="number"
            {...form.register("rounding", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Rounding minutes">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            type="number"
            {...form.register("roundingMinutes", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Locked time entries before">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="2026-03-20T00:00:00Z"
            {...form.register("reportLockedAt")}
          />
        </Field>
        <Field label="Required time entry fields">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={form.watch("requiredTimeEntryFields").join(", ")}
            onChange={(event) => {
              form.setValue(
                "requiredTimeEntryFields",
                event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              );
            }}
          />
        </Field>
        <ToggleField label="Show timesheet view">
          <input type="checkbox" {...form.register("showTimesheetView")} />
        </ToggleField>
        <ToggleField label="Hide start and end times">
          <input type="checkbox" {...form.register("hideStartEndTimes")} />
        </ToggleField>
        <ToggleField label="Reports collapse by default">
          <input type="checkbox" {...form.register("reportsCollapse")} />
        </ToggleField>
        <ToggleField label="Only admins may create projects">
          <input type="checkbox" {...form.register("onlyAdminsMayCreateProjects")} />
        </ToggleField>
        <ToggleField label="Only admins may create tags">
          <input type="checkbox" {...form.register("onlyAdminsMayCreateTags")} />
        </ToggleField>
        <ToggleField label="Only admins see team dashboard">
          <input type="checkbox" {...form.register("onlyAdminsSeeTeamDashboard")} />
        </ToggleField>
        <ToggleField label="Projects billable by default">
          <input type="checkbox" {...form.register("projectsBillableByDefault")} />
        </ToggleField>
        <ToggleField label="Projects public by default">
          <input
            type="checkbox"
            checked={!form.watch("projectsPrivateByDefault")}
            onChange={(event) => {
              form.setValue("projectsPrivateByDefault", !event.target.checked);
            }}
          />
        </ToggleField>
        <ToggleField label="Enforce billable time on billable projects">
          <input type="checkbox" {...form.register("projectsEnforceBillable")} />
        </ToggleField>
        <ToggleField label="Limit public project data to admins">
          <input type="checkbox" {...form.register("limitPublicProjectData")} />
        </ToggleField>

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

function ToggleField(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
