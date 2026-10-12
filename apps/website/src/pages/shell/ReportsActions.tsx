import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { AppButton } from "@opentickly/web-ui";
import { buildWorkspaceReportsPath, type ReportsTab } from "../../shared/lib/workspace-routing.ts";
import { ToolbarButton } from "./ReportsSharedWidgets.tsx";
import { exportReportCsv } from "./reports-export.ts";
import type { ReportsBreakdownRow, ReportsPageModel } from "./reports-page-data.ts";

export function ReportsActions({
  tab,
  workspaceId,
  roundingEnabled,
  roundingMinutes,
  onToggleRounding,
  displayModel,
  displayBreakdownRows,
  shareToast,
  onShare,
  isPending,
}: {
  tab: ReportsTab;
  workspaceId: number;
  roundingEnabled: boolean;
  roundingMinutes: number;
  onToggleRounding: () => void;
  displayModel: ReportsPageModel;
  displayBreakdownRows: ReportsBreakdownRow[];
  shareToast: boolean;
  onShare: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation("reports");
  const navigate = useNavigate();
  return tab === "custom" ? (
    <ToolbarButton
      onClick={() =>
        void navigate({
          to: buildWorkspaceReportsPath(workspaceId, "summary"),
        })
      }
    >
      {t("newReport")}
    </ToolbarButton>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton
        className={
          roundingEnabled
            ? "border-[var(--track-accent)] bg-[var(--track-accent-soft-strong)] text-[var(--track-accent-text)] shadow-[var(--track-depth-shadow-rest)] hover:border-[var(--track-accent)] hover:bg-[var(--track-accent-soft)] hover:shadow-[var(--track-depth-shadow-hover)]"
            : ""
        }
        aria-pressed={roundingEnabled}
        data-testid="reports-rounding-toggle"
        disabled={isPending || tab === "profitability" || roundingMinutes === 0}
        onClick={() => onToggleRounding()}
        size="sm"
        type="button"
        variant="secondary"
      >
        {roundingEnabled ? t("roundingOn") : t("roundingOff")}
      </AppButton>
      {tab === "summary" || tab === "detailed" ? (
        <ToolbarButton
          disabled={isPending}
          onClick={() => {
            const projectsParam = displayModel.breakdownRows
              .filter((r) => r.seconds > 0)
              .map((r) => `${r.name}:${(r.seconds / 3600).toFixed(2)}`)
              .join(",");
            const search = projectsParam
              ? `?from=reports&projects=${encodeURIComponent(projectsParam)}`
              : "";
            void navigate({
              to: `/workspaces/${workspaceId}/invoices/new${search}`,
            });
          }}
        >
          {t("createInvoice")}
        </ToolbarButton>
      ) : null}
      <AppButton
        data-testid="reports-export"
        disabled={isPending}
        onClick={() => exportReportCsv(displayBreakdownRows, displayModel.totalDuration)}
        size="sm"
        type="button"
        variant="secondary"
      >
        {t("export")}
      </AppButton>
      <ToolbarButton onClick={() => void navigate({ to: `/${workspaceId}/settings/general` })}>
        {t("settings")}
      </ToolbarButton>
      <AppButton
        className={shareToast ? "" : "text-[var(--track-text)]"}
        data-testid="reports-save-share"
        onClick={onShare}
        size="sm"
        type="button"
        variant={shareToast ? "primary" : "secondary"}
      >
        {t("saveAndShare")}
      </AppButton>
    </div>
  );
}
