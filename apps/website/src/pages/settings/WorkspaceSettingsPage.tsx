import { AppSurfaceState, PageLayout, pageLayoutTabClass, SurfaceCard } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BillableRatesContent } from "../billable-rates/BillableRatesPage.tsx";
import { SettingsActivity } from "../../features/settings/SettingsActivity.tsx";
import { SettingsCsvImport } from "../../features/settings/SettingsCsvImport.tsx";
import { SettingsDataExport } from "../../features/settings/SettingsDataExport.tsx";
import { WorkspaceSettingsForm } from "../../features/settings/WorkspaceSettingsForm.tsx";
import { createWorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { buildWorkspaceSettingsPathWithSection } from "../../shared/lib/workspace-routing.ts";
import type { UpdateWorkspaceSettingsRequestDto } from "../../shared/api/web-contract.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import {
  useUpdateWorkspaceSettingsMutation,
  useWorkspaceSettingsQuery,
} from "../../shared/query/web-shell.ts";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";
import type { WorkspaceSettingsSection } from "../../shared/url-state/workspace-settings-location.ts";

type WorkspaceSettingsPageProps = {
  section: WorkspaceSettingsSection;
  workspaceId: number;
};

export function WorkspaceSettingsPage({
  section,
  workspaceId,
}: WorkspaceSettingsPageProps): ReactElement {
  const { t } = useTranslation("settings");
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceSettingsMutation(workspaceId);

  const settingsTabs: Array<{
    id: WorkspaceSettingsSection;
    labelKey: string;
  }> = [
    { id: "general", labelKey: "general" },
    { id: "alerts", labelKey: "alerts" },
    { id: "reminders", labelKey: "reminders" },
    { id: "billable-rates", labelKey: "billableRatesTab" },
    { id: "import", labelKey: "csvImport" },
    { id: "export", labelKey: "dataExport" },
    { id: "sso", labelKey: "singleSignOn" },
    { id: "activity", labelKey: "activity" },
  ];

  return (
    <PageLayout
      data-testid="workspace-settings-page"
      title={t("settings")}
      tabs={settingsTabs.map((tab) => (
        <Link
          className={pageLayoutTabClass(section === tab.id)}
          key={tab.id}
          to={buildWorkspaceSettingsPathWithSection(workspaceId, tab.id)}
        >
          {t(tab.labelKey)}
          {section === tab.id ? (
            <AnimatedActiveIndicator
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]"
              layoutId="page-layout-tab-indicator"
            />
          ) : null}
        </Link>
      ))}
    >
      <div className="px-5 pb-10 pt-5">
        {settingsQuery.isError ? (
          <SettingsState
            description={t("settingsUnavailableDescription")}
            title={t("settingsUnavailable")}
            tone="error"
          />
        ) : null}

        {!settingsQuery.isPending && !settingsQuery.isError && !settingsQuery.data ? (
          <SettingsState
            description={t("settingsNoDataDescription")}
            title={t("settingsUnavailable")}
            tone="empty"
          />
        ) : null}

        {settingsQuery.data ? (
          <SettingsSectionContent
            onSubmit={async (request) => {
              await updateMutation.mutateAsync(request);
            }}
            onSubmitError={(err: unknown) => {
              toast.error(
                err instanceof WebApiError
                  ? err.userMessage
                  : t("toast:failedToSaveWorkspaceSettings"),
              );
            }}
            onSubmitSuccess={() => {
              toast.success(t("toast:workspaceSettingsSaved"));
            }}
            section={section}
            settingsData={settingsQuery.data}
            workspaceId={workspaceId}
            t={t}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}

function SettingsSectionContent(props: {
  onSubmit: (request: UpdateWorkspaceSettingsRequestDto) => Promise<void> | void;
  onSubmitError: (err: unknown) => void;
  onSubmitSuccess: () => void;
  section: WorkspaceSettingsSection;
  settingsData: Parameters<typeof createWorkspaceSettingsFormValues>[0];
  workspaceId: number;
  t: (key: string) => string;
}): ReactElement {
  switch (props.section) {
    case "general":
      return (
        <WorkspaceSettingsForm
          initialValues={createWorkspaceSettingsFormValues(props.settingsData)}
          onSubmit={props.onSubmit}
          onSubmitError={props.onSubmitError}
          onSubmitSuccess={props.onSubmitSuccess}
          workspaceId={props.workspaceId}
        />
      );
    case "billable-rates":
      return <BillableRatesContent />;
    case "import":
      return <SettingsCsvImport workspaceId={props.workspaceId} />;
    case "export":
      return <SettingsDataExport />;
    case "activity":
      return <SettingsActivity workspaceId={props.workspaceId} />;
    case "alerts":
      return (
        <FeatureWipNotice
          description="Configure alerts to notify workspace members when tracked time exceeds project or task budgets."
          title={props.t("alerts")}
        />
      );
    case "reminders":
      return (
        <FeatureWipNotice
          description="Set up tracking reminders to help your team remember to log their time consistently."
          title={props.t("reminders")}
        />
      );
    case "sso":
      return (
        <FeatureWipNotice
          description="Enable Single Sign On to let your team authenticate through your organization's identity provider."
          title={props.t("singleSignOn")}
        />
      );
    default:
      return (
        <SettingsState
          description={props.t("noConfigurableSettings")}
          title={props.t("section")}
          tone="empty"
        />
      );
  }
}

function SettingsState(props: {
  description: string;
  title: string;
  tone: "empty" | "error" | "loading";
}): ReactElement {
  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={props.description}
        title={props.title}
        tone={props.tone}
      />
    </SurfaceCard>
  );
}
