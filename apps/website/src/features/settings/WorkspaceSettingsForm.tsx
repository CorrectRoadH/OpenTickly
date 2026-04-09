import { type ReactElement, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  onSubmitError?: (err: unknown) => void;
  onSubmitSuccess?: () => void;
  workspaceId: number;
};

export function WorkspaceSettingsForm({
  initialValues,
  onSubmit,
  onSubmitError,
  onSubmitSuccess,
  workspaceId,
}: WorkspaceSettingsFormProps): ReactElement {
  const { t } = useTranslation("settings");
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
    } catch (err) {
      onSubmitError?.(err);
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
        <LogoCard
          logoUrl={form.watch("logoUrl")}
          onLogoChange={(url) => {
            form.setValue("logoUrl", url, { shouldDirty: false });
          }}
          workspaceId={workspaceId}
        />
        <div className="w-full max-w-[270px] lg:pt-[73px]">
          <FieldLabel label={t("workspaceName")} />
          <input
            className={textInputClassName}
            {...form.register("name")}
            aria-label={t("workspaceName")}
          />
        </div>
      </div>

      <SettingsCard description={t("teamMemberRightsDescription")} title={t("teamMemberRights")}>
        <div className="grid gap-6 xl:grid-cols-3">
          <RadioGroup label={t("whoCanSeeTeamActivity")}>
            <RadioOption
              checked={form.watch("onlyAdminsSeeTeamDashboard")}
              label={t("admins")}
              onChange={() => {
                form.setValue("onlyAdminsSeeTeamDashboard", true, { shouldDirty: true });
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsSeeTeamDashboard")}
              label={t("everyone")}
              onChange={() => {
                form.setValue("onlyAdminsSeeTeamDashboard", false, { shouldDirty: true });
              }}
            />
          </RadioGroup>
          <RadioGroup label={t("whoCanCreateProjectsAndClients")}>
            <RadioOption
              checked={form.watch("onlyAdminsMayCreateProjects")}
              label={t("admins")}
              onChange={() => {
                form.setValue("onlyAdminsMayCreateProjects", true, { shouldDirty: true });
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsMayCreateProjects")}
              label={t("everyone")}
              onChange={() => {
                form.setValue("onlyAdminsMayCreateProjects", false, { shouldDirty: true });
              }}
            />
          </RadioGroup>
          <RadioGroup label={t("whoCanCreateTags")}>
            <RadioOption
              checked={form.watch("onlyAdminsMayCreateTags")}
              label={t("admins")}
              onChange={() => {
                form.setValue("onlyAdminsMayCreateTags", true, { shouldDirty: true });
              }}
            />
            <RadioOption
              checked={!form.watch("onlyAdminsMayCreateTags")}
              label={t("everyone")}
              onChange={() => {
                form.setValue("onlyAdminsMayCreateTags", false, { shouldDirty: true });
              }}
            />
          </RadioGroup>
        </div>
      </SettingsCard>

      <SettingsCard
        description={t("projectAndBillingDefaultsDescription")}
        title={t("projectAndBillingDefaults")}
      >
        <div className="space-y-4 py-5">
          <SectionCaption>{t("projectSettings")}</SectionCaption>
          <div className="space-y-2">
            <CheckboxOption
              checked={form.watch("projectsBillableByDefault")}
              label={t("setNewProjectsAsBillableByDefault")}
              onChange={(checked) => {
                form.setValue("projectsBillableByDefault", checked, { shouldDirty: true });
              }}
            />
            <CheckboxOption
              checked={!form.watch("projectsPrivateByDefault")}
              label={t("setNewProjectsAsPublicByDefault")}
              onChange={(checked) => {
                form.setValue("projectsPrivateByDefault", !checked, { shouldDirty: true });
              }}
            />
            <CheckboxOption
              checked={form.watch("limitPublicProjectData")}
              label={t("limitPublicProjectsDataInReportsToAdmins")}
              onChange={(checked) => {
                form.setValue("limitPublicProjectData", checked, { shouldDirty: true });
              }}
            />
            <CheckboxOption
              checked={form.watch("projectsEnforceBillable")}
              label={t("enforceBillableTimeEntriesOnBillableProjects")}
              onChange={(checked) => {
                form.setValue("projectsEnforceBillable", checked, { shouldDirty: true });
              }}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        description={t("timeEntryAndTimesheetRestrictionsDescription")}
        title={t("timeEntryAndTimesheetRestrictions")}
      >
        <ToggleSection
          checked={requiredTimeEntryFields.length > 0}
          description={t("setRequiredFieldsDescription")}
          title={t("setRequiredFieldsForNewTimeEntries")}
          onChange={(checked) => {
            form.setValue("requiredTimeEntryFields", checked ? ["project", "task"] : [], {
              shouldDirty: true,
            });
          }}
        />
        <ToggleSection
          checked={lockTimeEntriesEnabled}
          description={t("lockTimeEntriesDescription")}
          title={t("lockTimeEntries")}
          onChange={(checked) => {
            form.setValue(
              "reportLockedAt",
              checked ? initialValues.reportLockedAt || "2026-03-20T00:00:00Z" : "",
              { shouldDirty: true },
            );
          }}
        >
          {lockTimeEntriesEnabled ? (
            <div className="pt-3">
              <FieldLabel label={t("lockDate")} />
              <input
                className={textInputClassName}
                placeholder="2026-03-20T00:00:00Z"
                {...form.register("reportLockedAt")}
              />
            </div>
          ) : null}
        </ToggleSection>
      </SettingsCard>

      <SettingsCard description={t("timeEntrySettingsDescription")} title={t("timeEntrySettings")}>
        <div className="space-y-4 py-5">
          <SectionCaption>{t("defaultMode")}</SectionCaption>
          <div className="space-y-2">
            <RadioOption
              checked={form.watch("hideStartEndTimes")}
              label={t("hideStartAndEndTimes")}
              onChange={() => {
                form.setValue("hideStartEndTimes", true, { shouldDirty: true });
              }}
            />
            <RadioOption
              checked={!form.watch("hideStartEndTimes")}
              label={t("showStartAndEndTimes")}
              onChange={() => {
                form.setValue("hideStartEndTimes", false, { shouldDirty: true });
              }}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        description={t("timesheetViewSettingsDescription")}
        title={t("timesheetViewSettings")}
      >
        <div className="space-y-2 py-5">
          <RadioOption
            checked={!form.watch("showTimesheetView")}
            label={t("hideTimesheetView")}
            onChange={() => {
              form.setValue("showTimesheetView", false, { shouldDirty: true });
            }}
          />
          <RadioOption
            checked={form.watch("showTimesheetView")}
            label={t("showTimesheetView")}
            onChange={() => {
              form.setValue("showTimesheetView", true, { shouldDirty: true });
            }}
          />
        </div>
      </SettingsCard>

      <SettingsCard description={t("reportingDescription")} title={t("reporting")}>
        <ToggleSection
          checked={form.watch("reportsCollapse")}
          description={t("collapseSmallEntriesDescription")}
          title={t("collapseSmallEntriesInPdfExports")}
          onChange={(checked) => {
            form.setValue("reportsCollapse", checked, { shouldDirty: true });
          }}
        />
      </SettingsCard>

      <div className="pt-1 text-center text-[12px] font-medium text-[var(--track-text-muted)]">
        <div className="mx-auto mb-4 h-px w-[200px] bg-[var(--track-overlay-border)]" />
        {t("needHelpMakingTogglFitYourTeam")}{" "}
        <a className="text-[var(--track-text)] hover:text-white" href="#">
          {t("getAFreeDemo")}
        </a>
      </div>
    </form>
  );
}
