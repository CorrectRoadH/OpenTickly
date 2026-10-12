import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { WorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { RadioOption, SettingsCard } from "./WorkspaceSettingsFormPrimitives.tsx";

export function WorkspaceTimesheetSettings({
  form,
}: {
  form: UseFormReturn<WorkspaceSettingsFormValues>;
}) {
  const { t } = useTranslation("settings");
  return (
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
  );
}
