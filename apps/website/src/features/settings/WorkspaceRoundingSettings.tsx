import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { WorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { SettingsCard, textInputClassName } from "./WorkspaceSettingsFormPrimitives.tsx";

export function WorkspaceRoundingSettings({
  form,
}: {
  form: UseFormReturn<WorkspaceSettingsFormValues>;
}) {
  const { t } = useTranslation("settings");
  const minutes = form.watch("roundingMinutes");
  const intervals = [...new Set([0, 1, 5, 6, 10, 12, 15, 30, 60, 240, minutes])].sort(
    (a, b) => a - b,
  );
  return (
    <SettingsCard title={t("timeRounding")} description={t("timeRoundingDescription")}>
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-2 text-sm text-[var(--track-text)]">
          {t("roundingDirection")}
          <select
            className={textInputClassName}
            value={form.watch("rounding")}
            onChange={(event) => {
              form.setValue("rounding", Number(event.target.value), { shouldDirty: true });
              if (minutes === 0) form.setValue("roundingMinutes", 5, { shouldDirty: true });
            }}
          >
            <option value={0}>{t("roundingNearest")}</option>
            <option value={1}>{t("roundingUp")}</option>
            <option value={-1}>{t("roundingDown")}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-[var(--track-text)]">
          {t("roundingInterval")}
          <select
            className={textInputClassName}
            value={minutes}
            onChange={(event) => {
              const value = Number(event.target.value);
              form.setValue("roundingMinutes", value, { shouldDirty: true });
              if (value === 0) form.setValue("rounding", 0, { shouldDirty: true });
            }}
          >
            {intervals.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? t("roundingDisabled") : t("roundingMinutes", { count: value })}
              </option>
            ))}
          </select>
        </label>
      </div>
    </SettingsCard>
  );
}
