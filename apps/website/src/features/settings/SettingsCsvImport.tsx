import { AppButton, SurfaceCard } from "@opentoggl/web-ui";
import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { buildWorkspaceImportPath } from "../../shared/lib/workspace-routing.ts";

type SettingsCsvImportProps = {
  workspaceId?: number;
};

export function SettingsCsvImport(_props: SettingsCsvImportProps): ReactElement {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();

  const expectedColumns = [
    { name: t("columnDescription"), detail: t("columnTimeEntryDescription") },
    { name: t("columnProject"), detail: t("columnProjectName") },
    { name: t("columnClient"), detail: t("columnClientName") },
    { name: t("columnStart"), detail: t("columnStartDateTime") },
    { name: t("columnStop"), detail: t("columnStopDateTime") },
    { name: t("columnDuration"), detail: t("columnDurationFormat") },
    { name: t("columnBillable"), detail: t("columnBillableYesNo") },
    { name: t("columnTags"), detail: t("columnTagsCommaSeparated") },
  ];

  return (
    <SurfaceCard>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-[14px] font-semibold text-white">{t("csvImportTitle")}</h2>
          <p className="mt-1 text-[12px] text-[var(--track-text-muted)]">
            {t("csvImportDescription")}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-[14px] font-medium text-[var(--track-text-soft)]">
            {t("expectedCsvFormat")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--track-border)] text-[var(--track-text-soft)]">
                  <th className="pb-2 pr-4 font-medium">{t("columnDescription")}</th>
                  <th className="pb-2 font-medium">{t("columnTimeEntryDescription")}</th>
                </tr>
              </thead>
              <tbody>
                {expectedColumns.map((col) => (
                  <tr
                    className="border-b border-[var(--track-border)] last:border-b-0"
                    key={col.name}
                  >
                    <td className="py-2 pr-4 font-mono text-white">{col.name}</td>
                    <td className="py-2 text-[var(--track-text-muted)]">{col.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AppButton
          onClick={() => {
            void navigate({ to: buildWorkspaceImportPath() });
          }}
          type="button"
        >
          {t("goToCsvImport")}
        </AppButton>
      </div>
    </SurfaceCard>
  );
}
