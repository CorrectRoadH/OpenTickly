import { type ReactElement, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  mapWorkspaceSettingsFormToRequest,
  type WorkspaceSettingsFormValues,
} from "../../shared/forms/settings-form.ts";
import {
  CheckboxOption,
  FieldLabel,
  HiddenField,
  LogoCard,
  RadioGroup,
  RadioOption,
  SectionCaption,
  SettingsCard,
  textInputClassName,
  ToggleSection,
} from "./WorkspaceSettingsFormPrimitives.tsx";

type WorkspaceSettingsFormProps = {
  initialValues: WorkspaceSettingsFormValues;
  onSubmit: (request: ReturnType<typeof mapWorkspaceSettingsFormToRequest>) => Promise<void> | void;
  onSubmitError?: () => void;
  onSubmitSuccess?: () => void;
};

export function WorkspaceSettingsForm({
  initialValues,
  onSubmit,
  onSubmitError,
  onSubmitSuccess,
}: WorkspaceSettingsFormProps): ReactElement {
  const form = useForm<WorkspaceSettingsFormValues>({
    defaultValues: initialValues,
  });
  const values = useWatch({
    control: form.control,
  });
  const requiredTimeEntryFields = form.watch("requiredTimeEntryFields");
  const lockTimeEntriesEnabled = form.watch("reportLockedAt").trim().length > 0;
  const lastSavedValuesRef = useRef(JSON.stringify(initialValues));
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingRetryRef = useRef(false);

  useEffect(() => {
    form.reset(initialValues);
    lastSavedValuesRef.current = JSON.stringify(initialValues);
  }, [form, initialValues]);

  useEffect(() => {
    if (!form.formState.isDirty) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveLatestValues();
    }, 900);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form.formState.isDirty, values]);

  async function saveLatestValues(): Promise<void> {
    const latestValues = form.getValues();
    const serializedValues = JSON.stringify(latestValues);

    if (serializedValues === lastSavedValuesRef.current) {
      return;
    }

    if (saveInFlightRef.current) {
      pendingRetryRef.current = true;
      return;
    }

    saveInFlightRef.current = true;

    try {
      await onSubmit(mapWorkspaceSettingsFormToRequest(latestValues));
      lastSavedValuesRef.current = serializedValues;
      form.reset(latestValues);
      onSubmitSuccess?.();
    } catch {
      onSubmitError?.();
    } finally {
      saveInFlightRef.current = false;

      if (pendingRetryRef.current) {
        pendingRetryRef.current = false;
        void saveLatestValues();
      }
    }
  }

  return (
    <form className="space-y-5" data-testid="workspace-settings-form">
      <HiddenField type="hidden" {...form.register("defaultCurrency")} />
      <HiddenField type="hidden" {...form.register("defaultHourlyRate", { valueAsNumber: true })} />
      <HiddenField type="hidden" {...form.register("rounding", { valueAsNumber: true })} />
      <HiddenField type="hidden" {...form.register("roundingMinutes", { valueAsNumber: true })} />
      <HiddenField type="hidden" {...form.register("logoUrl")} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <LogoCard />
        <div className="w-full max-w-[270px] lg:pt-[73px]">
          <FieldLabel label="Workspace Name" />
          <input
            className={textInputClassName}
            {...form.register("name")}
            aria-label="Workspace name"
          />
        </div>
      </div>

      <SettingsCard
        description="Access and visibility rights for team members"
        title="Team member rights"
      >
        <div className="grid gap-6 xl:grid-cols-3">
          <RadioGroup label="Who can see Team Activity">
            <RadioOption
              checked={form.watch("onlyAdminsSeeTeamDashboard")}
              label="Admins"
              onChange={() => {
                form.setValue("onlyAdminsSeeTeamDashboard", true);
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsSeeTeamDashboard")}
              label="Everyone"
              onChange={() => {
                form.setValue("onlyAdminsSeeTeamDashboard", false);
              }}
            />
          </RadioGroup>
          <RadioGroup label="Who can create projects and clients">
            <RadioOption
              checked={form.watch("onlyAdminsMayCreateProjects")}
              label="Admins"
              onChange={() => {
                form.setValue("onlyAdminsMayCreateProjects", true);
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsMayCreateProjects")}
              label="Everyone"
              onChange={() => {
                form.setValue("onlyAdminsMayCreateProjects", false);
              }}
            />
          </RadioGroup>
          <RadioGroup label="Who can create tags">
            <RadioOption
              checked={form.watch("onlyAdminsMayCreateTags")}
              label="Admins"
              onChange={() => {
                form.setValue("onlyAdminsMayCreateTags", true);
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsMayCreateTags")}
              label="Everyone"
              onChange={() => {
                form.setValue("onlyAdminsMayCreateTags", false);
              }}
            />
          </RadioGroup>
        </div>
      </SettingsCard>

      <SettingsCard
        description="How new projects and billing will be set up by default if not defined otherwise"
        title="Project & Billing defaults"
      >
        <div className="space-y-4 py-5">
          <SectionCaption>Project settings</SectionCaption>
          <div className="space-y-2">
            <CheckboxOption
              checked={form.watch("projectsBillableByDefault")}
              label={'Set new projects as "billable" by default'}
              onChange={(checked) => {
                form.setValue("projectsBillableByDefault", checked);
              }}
            />
            <CheckboxOption
              checked={!form.watch("projectsPrivateByDefault")}
              label={'Set new projects as "public" by default'}
              onChange={(checked) => {
                form.setValue("projectsPrivateByDefault", !checked);
              }}
            />
            <CheckboxOption
              checked={form.watch("limitPublicProjectData")}
              label="Limit public projects data in reports to admins"
              onChange={(checked) => {
                form.setValue("limitPublicProjectData", checked);
              }}
            />
            <CheckboxOption
              checked={form.watch("projectsEnforceBillable")}
              label="Enforce billable time entries on billable projects"
              onChange={(checked) => {
                form.setValue("projectsEnforceBillable", checked);
              }}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        description="Set rules to make sure your reports or timesheets are always orderly"
        title="Time entry and timesheet restrictions"
      >
        <ToggleSection
          checked={requiredTimeEntryFields.length > 0}
          description="Setting required fields helps to ensure your team fills in all the information you need for accurate reporting"
          title="Set required fields for new Time entries"
          onChange={(checked) => {
            form.setValue("requiredTimeEntryFields", checked ? ["project", "task"] : []);
          }}
        />
        <ToggleSection
          checked={lockTimeEntriesEnabled}
          description="This allows to lock existing Time entries and prevent creating new ones before selected date"
          title="Lock Time entries"
          onChange={(checked) => {
            form.setValue(
              "reportLockedAt",
              checked ? initialValues.reportLockedAt || "2026-03-20T00:00:00Z" : "",
            );
          }}
        >
          {lockTimeEntriesEnabled ? (
            <div className="pt-3">
              <FieldLabel label="Lock date" />
              <input
                className={textInputClassName}
                placeholder="2026-03-20T00:00:00Z"
                {...form.register("reportLockedAt")}
              />
            </div>
          ) : null}
        </ToggleSection>
      </SettingsCard>

      <SettingsCard
        description="Define the default approach your team should use to log time. You can opt for simplicity with 'Hide start and end times' mode or choose 'Show start and end times' for detailed time logs with start and end times."
        title="Time entry settings"
      >
        <div className="space-y-4 py-5">
          <SectionCaption>Default mode</SectionCaption>
          <div className="space-y-2">
            <RadioOption
              checked={form.watch("hideStartEndTimes")}
              label="Hide start and end times"
              onChange={() => {
                form.setValue("hideStartEndTimes", true);
              }}
            />
            <RadioOption
              checked={!form.watch("hideStartEndTimes")}
              label="Show start and end times"
              onChange={() => {
                form.setValue("hideStartEndTimes", false);
              }}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        description="Choose how you and your team manage time entries. Opt for the effortless way of handling and viewing them with the Timesheet View."
        title="Timesheet view settings"
      >
        <div className="space-y-2 py-5">
          <RadioOption
            checked={!form.watch("showTimesheetView")}
            label="Hide timesheet view"
            onChange={() => {
              form.setValue("showTimesheetView", false);
            }}
          />
          <RadioOption
            checked={form.watch("showTimesheetView")}
            label="Show timesheet view"
            onChange={() => {
              form.setValue("showTimesheetView", true);
            }}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        description="Choose how data is presented to simplify the analysis of tracked time"
        title="Reporting"
      >
        <ToggleSection
          checked={form.watch("reportsCollapse")}
          description={
            'Entries that take less than 2% of the donut chart will be included in the "Other" category'
          }
          title="Collapse small entries in PDF exports"
          onChange={(checked) => {
            form.setValue("reportsCollapse", checked);
          }}
        />
      </SettingsCard>

      <div className="pt-1 text-center text-[12px] font-medium text-[#b1b1b1]">
        <div className="mx-auto mb-4 h-px w-[200px] bg-[#2a2a2a]" />
        Need help making Toggl Track fit your team&apos;s needs?{" "}
        <a className="text-[#fafafa] hover:text-white" href="#">
          Get a free demo
        </a>
      </div>
    </form>
  );
}
