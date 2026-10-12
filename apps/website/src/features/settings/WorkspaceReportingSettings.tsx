import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { WorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { SettingsCard, ToggleSection } from "./WorkspaceSettingsFormPrimitives.tsx";

export function WorkspaceReportingSettings({
  form,
}: {
  form: UseFormReturn<WorkspaceSettingsFormValues>;
}) {
  const { t } = useTranslation("settings");
  return (
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
  );
}
