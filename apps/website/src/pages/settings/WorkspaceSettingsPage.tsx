import {
  AppSurfaceState,
  PageLayout,
  PageLayoutTabIndicator,
  pageLayoutTabClass,
  SurfaceCard,
} from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { toast } from "sonner";

import { BillableRatesContent } from "../billable-rates/BillableRatesPage.tsx";
import { SettingsActivity } from "../../features/settings/SettingsActivity.tsx";
import { SettingsCsvImport } from "../../features/settings/SettingsCsvImport.tsx";
import { SettingsDataExport } from "../../features/settings/SettingsDataExport.tsx";
import { WorkspaceSettingsForm } from "../../features/settings/WorkspaceSettingsForm.tsx";
import { createWorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { buildWorkspaceSettingsPathWithSection } from "../../shared/lib/workspace-routing.ts";
import type { UpdateWorkspaceSettingsRequestDto } from "../../shared/api/web-contract.ts";
import {
  useUpdateWorkspaceSettingsMutation,
  useWorkspaceSettingsQuery,
} from "../../shared/query/web-shell.ts";
import { FeatureWipNotice } from "../../shared/ui/FeatureWipNotice.tsx";
import type { WorkspaceSettingsSection } from "../../shared/url-state/workspace-settings-location.ts";

type WorkspaceSettingsPageProps = {
  section: WorkspaceSettingsSection;
  workspaceId: number;
};

const settingsTabs: Array<{
  id: WorkspaceSettingsSection;
  label: string;
}> = [
  { id: "general", label: "General" },
  { id: "alerts", label: "Alerts" },
  { id: "reminders", label: "Reminders" },
  { id: "billable-rates", label: "Billable rates" },
  { id: "import", label: "CSV import" },
  { id: "export", label: "Data export" },
  { id: "sso", label: "Single Sign On" },
  { id: "activity", label: "Activity" },
];

export function WorkspaceSettingsPage({
  section,
  workspaceId,
}: WorkspaceSettingsPageProps): ReactElement {
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceSettingsMutation(workspaceId);

  return (
    <PageLayout
      data-testid="workspace-settings-page"
      title="Settings"
      tabs={settingsTabs.map((tab) => (
        <Link
          className={pageLayoutTabClass(section === tab.id)}
          key={tab.id}
          to={buildWorkspaceSettingsPathWithSection(workspaceId, tab.id)}
        >
          {tab.label}
          {section === tab.id ? <PageLayoutTabIndicator /> : null}
        </Link>
      ))}
    >
      <div className="px-5 pb-10 pt-5">
        {settingsQuery.isError ? (
          <SettingsState
            description="We could not load workspace settings right now. Refresh or try again shortly."
            title="Settings unavailable"
            tone="error"
          />
        ) : null}

        {!settingsQuery.isPending && !settingsQuery.isError && !settingsQuery.data ? (
          <SettingsState
            description="No workspace settings data was returned for this workspace."
            title="Settings unavailable"
            tone="empty"
          />
        ) : null}

        {settingsQuery.data ? (
          <SettingsSectionContent
            onSubmit={async (request) => {
              await updateMutation.mutateAsync(request);
            }}
            onSubmitError={() => {
              toast.error("We could not save this change. Try again in a moment.");
            }}
            onSubmitSuccess={() => {
              toast.success("Your workspace has been updated");
            }}
            section={section}
            settingsData={settingsQuery.data}
            workspaceId={workspaceId}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}

function SettingsSectionContent(props: {
  onSubmit: (request: UpdateWorkspaceSettingsRequestDto) => Promise<void> | void;
  onSubmitError: () => void;
  onSubmitSuccess: () => void;
  section: WorkspaceSettingsSection;
  settingsData: Parameters<typeof createWorkspaceSettingsFormValues>[0];
  workspaceId: number;
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
      return <BillableRatesContent workspaceId={props.workspaceId} />;
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
          title="Alerts"
        />
      );
    case "reminders":
      return (
        <FeatureWipNotice
          description="Set up tracking reminders to help your team remember to log their time consistently."
          title="Reminders"
        />
      );
    case "sso":
      return (
        <FeatureWipNotice
          description="Enable Single Sign On to let your team authenticate through your organization's identity provider."
          title="Single Sign On"
        />
      );
    default:
      return (
        <SettingsState
          description="This section has no configurable settings."
          title={settingsTabs.find((tab) => tab.id === props.section)?.label ?? "Section"}
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
