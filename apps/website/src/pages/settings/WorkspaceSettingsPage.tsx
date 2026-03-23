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
    <div className="min-h-full bg-[#151515]" data-testid="workspace-settings-page">
      <div className="mx-auto max-w-[1384px]">
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
      {toast ? <SettingsToast {...toast} /> : null}
    </div>
  );
}

function SettingsHeader(props: {
  activeSection: WorkspaceSettingsSection;
  workspaceId: number;
}): ReactElement {
  return (
    <header className="flex h-[66px] items-center border-b border-[#3a3a3a] bg-[#1b1b1b] px-5">
      <div className="pr-5 text-[16px] font-semibold leading-[20.8px] text-[#fafafa]">Settings</div>
      <nav className="flex flex-wrap items-center gap-1">
        {settingsTabs.map((tab) => (
          <Link
            className={`rounded-[8px] px-3 py-[6px] text-[14px] font-semibold leading-5 ${
              props.activeSection === tab.id ? "text-[#cd7fc2]" : "text-[#999] hover:text-[#fafafa]"
            }`}
            key={tab.id}
            to={buildWorkspaceSettingsPathWithSection(props.workspaceId, tab.id)}
          >
            <span
              className={`border-b-2 pb-[2px] ${
                props.activeSection === tab.id ? "border-[#cd7fc2]" : "border-transparent"
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
    <div className="rounded-[8px] border border-[#3a3a3a] bg-[#1b1b1b]">
      <AppSurfaceState
        className="border-none bg-transparent text-[#d8d8d8]"
        description={props.description}
        title={props.title}
        tone={props.tone}
      />
    </div>
  );
}

function SettingsToast(props: {
  description: string;
  title: string;
  tone: "error" | "success";
}): ReactElement {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 min-w-[420px] rounded-[16px] border px-8 py-7 shadow-[0px_10px_30px_rgba(0,0,0,0.35)] ${
        props.tone === "success" ? "border-[#3a3a3a] bg-[#1d1d1d]" : "border-[#6a2e41] bg-[#22161b]"
      }`}
      data-testid="workspace-settings-toast"
    >
      <p
        className={`text-[28px] font-semibold leading-[1.1] ${
          props.tone === "success" ? "text-[#12b76a]" : "text-[#ff6b8f]"
        }`}
      >
        {props.title}
      </p>
      <p className="mt-3 text-[24px] font-semibold leading-[1.2] text-[#f5f5f5]">
        {props.description}
      </p>
    </div>
  );
}
