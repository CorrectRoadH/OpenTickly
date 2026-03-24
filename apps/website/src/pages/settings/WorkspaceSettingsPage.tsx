import { AppSurfaceState } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useEffect, useState } from "react";

import { WorkspaceSettingsForm } from "../../features/settings/WorkspaceSettingsForm.tsx";
import { createWorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { buildWorkspaceSettingsPathWithSection } from "../../shared/lib/workspace-routing.ts";
import {
  useUpdateWorkspaceSettingsMutation,
  useWorkspaceSettingsQuery,
} from "../../shared/query/web-shell.ts";
import {
  ShellPageHeader,
  ShellSurfaceCard,
  ShellToast,
} from "../../shared/ui/TrackDirectoryPrimitives.tsx";
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
  const [toast, setToast] = useState<{
    description: string;
    title: string;
    tone: "error" | "success";
  } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      clearTimeout(timeout);
    };
  }, [toast]);

  return (
    <div className="min-h-full bg-[var(--track-surface)]" data-testid="workspace-settings-page">
      <div className="max-w-[1384px]">
        <SettingsHeader activeSection={section} workspaceId={workspaceId} />
        <div className="px-5 pb-10 pt-5">
          {settingsQuery.isPending ? (
            <SettingsState
              description="Fetching workspace settings and current workspace policy defaults."
              title="Loading settings"
              tone="loading"
            />
          ) : null}

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
            section === "general" ? (
              <WorkspaceSettingsForm
                initialValues={createWorkspaceSettingsFormValues(settingsQuery.data)}
                onSubmitError={() => {
                  setToast({
                    description: "We could not save this change. Try again in a moment.",
                    title: "Could not save workspace",
                    tone: "error",
                  });
                }}
                onSubmit={async (request) => {
                  await updateMutation.mutateAsync(request);
                }}
                onSubmitSuccess={() => {
                  setToast({
                    description: "Your workspace has been updated",
                    title: "Success!",
                    tone: "success",
                  });
                }}
              />
            ) : (
              <SettingsState
                description="This section is part of the final settings information architecture, but only General is wired in this build."
                title={`${settingsTabs.find((tab) => tab.id === section)?.label ?? "Section"} is not available yet`}
                tone="empty"
              />
            )
          ) : null}
        </div>
      </div>
      {toast ? <ShellToast {...toast} /> : null}
    </div>
  );
}

function SettingsHeader(props: {
  activeSection: WorkspaceSettingsSection;
  workspaceId: number;
}): ReactElement {
  return (
    <header className="border-b border-[var(--track-border)] bg-[var(--track-surface)]">
      <ShellPageHeader title="Settings" />
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
