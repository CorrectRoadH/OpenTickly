import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";

import {
  mapWorkspaceSettingsFormToRequest,
  type WorkspaceSettingsFormValues,
} from "../../shared/forms/settings-form.ts";

type WorkspaceSettingsFormProps = {
  brandingHref: string;
  initialValues: WorkspaceSettingsFormValues;
  onSubmit: (request: ReturnType<typeof mapWorkspaceSettingsFormToRequest>) => Promise<void> | void;
};

const fieldClassName = "rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 text-white";
const checkboxClassName =
  "h-4 w-4 rounded border-white/20 bg-[#111114] text-[#c792d1] focus:ring-[#c792d1]";

export function WorkspaceSettingsForm({
  brandingHref,
  initialValues,
  onSubmit,
}: WorkspaceSettingsFormProps): ReactElement {
  const form = useForm<WorkspaceSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="workspace-settings-form">
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(mapWorkspaceSettingsFormToRequest(values));
        })}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">General</h2>
          <p className="text-sm leading-6 text-slate-400">
            Workspace defaults here flow into tracking and reports behavior, so they stay in the
            tenant settings surface instead of the profile page.
          </p>
        </div>

        <section
          className="space-y-4 rounded-xl border border-white/10 bg-[#18181c] p-4"
          data-testid="workspace-settings-general-section"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Workspace name">
              <input className={fieldClassName} {...form.register("name")} />
            </Field>
            <Field label="Default currency">
              <input className={fieldClassName} {...form.register("defaultCurrency")} />
            </Field>
            <Field label="Default hourly rate">
              <input
                className={fieldClassName}
                step="0.01"
                type="number"
                {...form.register("defaultHourlyRate", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Rounding mode">
              <input
                className={fieldClassName}
                type="number"
                {...form.register("rounding", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Rounding minutes">
              <input
                className={fieldClassName}
                type="number"
                {...form.register("roundingMinutes", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Locked time entries before">
              <input
                className={fieldClassName}
                placeholder="2026-03-20T00:00:00Z"
                {...form.register("reportLockedAt")}
              />
            </Field>
          </div>

          <Field label="Required time entry fields">
            <input
              className={fieldClassName}
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
        </section>

        <section className="space-y-4 rounded-xl border border-white/10 bg-[#18181c] p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Tracking defaults</p>
            <p className="text-sm leading-6 text-slate-400">
              These options shape how time entry data appears and behaves across tracking surfaces.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Show timesheet view">
              <input className={checkboxClassName} type="checkbox" {...form.register("showTimesheetView")} />
            </ToggleField>
            <ToggleField label="Hide start and end times">
              <input className={checkboxClassName} type="checkbox" {...form.register("hideStartEndTimes")} />
            </ToggleField>
            <ToggleField label="Reports collapse by default">
              <input className={checkboxClassName} type="checkbox" {...form.register("reportsCollapse")} />
            </ToggleField>
            <ToggleField label="Projects billable by default">
              <input className={checkboxClassName} type="checkbox" {...form.register("projectsBillableByDefault")} />
            </ToggleField>
            <ToggleField label="Projects public by default">
              <input
                checked={!form.watch("projectsPrivateByDefault")}
                className={checkboxClassName}
                type="checkbox"
                onChange={(event) => {
                  form.setValue("projectsPrivateByDefault", !event.target.checked);
                }}
              />
            </ToggleField>
            <ToggleField label="Enforce billable time on billable projects">
              <input className={checkboxClassName} type="checkbox" {...form.register("projectsEnforceBillable")} />
            </ToggleField>
          </div>
        </section>

        <section
          className="space-y-4 rounded-xl border border-white/10 bg-[#18181c] p-4"
          data-testid="workspace-settings-policy-section"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Access policy</p>
            <p className="text-sm leading-6 text-slate-400">
              Control who can create shared objects and how much public project data members can
              see by default.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Only admins may create projects">
              <input className={checkboxClassName} type="checkbox" {...form.register("onlyAdminsMayCreateProjects")} />
            </ToggleField>
            <ToggleField label="Only admins may create tags">
              <input className={checkboxClassName} type="checkbox" {...form.register("onlyAdminsMayCreateTags")} />
            </ToggleField>
            <ToggleField label="Only admins see team dashboard">
              <input className={checkboxClassName} type="checkbox" {...form.register("onlyAdminsSeeTeamDashboard")} />
            </ToggleField>
            <ToggleField label="Limit public project data to admins">
              <input className={checkboxClassName} type="checkbox" {...form.register("limitPublicProjectData")} />
            </ToggleField>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#18181c] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Branding</p>
              <p className="text-sm leading-6 text-slate-400">
                Keep logo and avatar entry points discoverable from the settings workbench.
              </p>
              <p className="text-sm text-slate-300">
                Current logo URL: {initialValues.logoUrl || "No logo configured yet."}
              </p>
            </div>
            <a
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/8"
              href={brandingHref}
            >
              Manage logo and avatar
            </a>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <AppButton type="submit">Save workspace settings</AppButton>
        </div>
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
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#141418] px-4 py-3 text-sm font-medium text-slate-300">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
