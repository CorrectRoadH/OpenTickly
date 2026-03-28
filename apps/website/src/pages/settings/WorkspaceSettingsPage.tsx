import { AppSurfaceState, ShellPageHeader, ShellSurfaceCard } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { toast } from "sonner";

import { SettingsActivity } from "../../features/settings/SettingsActivity.tsx";
import { SettingsAuditLog } from "../../features/settings/SettingsAuditLog.tsx";
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
  { id: "csv-import", label: "CSV import" },
  { id: "data-export", label: "Data export" },
  { id: "single-sign-on", label: "Single Sign On" },
  { id: "activity", label: "Activity" },
  { id: "audit-log", label: "Audit Log" },
];

export function WorkspaceSettingsPage({
  section,
  workspaceId,
}: WorkspaceSettingsPageProps): ReactElement {
  const settingsQuery = useWorkspaceSettingsQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceSettingsMutation(workspaceId);

  return (
    <div className="min-h-full bg-[var(--track-surface)]" data-testid="workspace-settings-page">
      <div className="max-w-[1384px]">
        <SettingsHeader activeSection={section} workspaceId={workspaceId} />
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
      </div>
    </div>
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
        />
      );
    case "csv-import":
      return <SettingsCsvImport workspaceId={props.workspaceId} />;
    case "data-export":
      return <SettingsDataExport />;
    case "audit-log":
      return <SettingsAuditLog workspaceId={props.workspaceId} />;
    case "activity":
      return <SettingsActivity workspaceId={props.workspaceId} />;
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

function SettingsHeader(props: {
  activeSection: WorkspaceSettingsSection;
  workspaceId: number;
}): ReactElement {
  return (
    <header className="bg-[var(--track-surface)]">
      <ShellPageHeader bordered title="Settings" />
      <nav className="flex flex-wrap items-center gap-1 px-5 pb-3">
        {settingsTabs.map((tab) => (
          <Link
            className={`rounded-[8px] px-3 py-[6px] text-[14px] font-semibold leading-5 ${
              props.activeSection === tab.id
                ? "text-[var(--track-accent)]"
                : "text-[var(--track-text-soft)] hover:text-white"
            }`}
            key={tab.id}
            to={buildWorkspaceSettingsPathWithSection(props.workspaceId, tab.id)}
          >
            <span
              className={`border-b-2 pb-[2px] ${
                props.activeSection === tab.id
                  ? "border-[var(--track-accent)]"
                  : "border-transparent"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

function SettingsState(props: {
  description: string;
  title: string;
  tone: "empty" | "error" | "loading";
}): ReactElement {
  return (
    <ShellSurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={props.description}
        title={props.title}
        tone={props.tone}
      />
    </ShellSurfaceCard>
  );
}
