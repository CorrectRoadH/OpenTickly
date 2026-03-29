import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildOverviewPath,
  buildProjectsPath,
  buildWorkspaceReportsPath,
  buildWorkspaceSettingsPathWithSection,
  buildTimerPath,
} from "./workspace-routing.ts";

export type ShellNavigationSection = {
  items: Array<{
    badge?: string;
    disabled?: boolean;
    label: string;
    to?: string;
  }>;
  title: string;
};

export function shellNavigationItems(session: SessionBootstrapViewModel): ShellNavigationSection[] {
  return [
    {
      title: "Track",
      items: [
        {
          label: "Overview",
          to: buildOverviewPath(),
        },
        {
          label: "Timer",
          to: buildTimerPath(),
        },
      ],
    },
    {
      title: "Analyze",
      items: [
        {
          label: "Reports",
          to: buildWorkspaceReportsPath(session.currentWorkspace.id),
        },
        {
          label: "Approvals",
          to: `/workspaces/${session.currentWorkspace.id}/approvals/team`,
        },
      ],
    },
    {
      title: "Manage",
      items: [
        {
          label: "Projects",
          to: buildProjectsPath(session.currentWorkspace.id),
        },
        {
          label: "Clients",
          to: `/workspaces/${session.currentWorkspace.id}/clients`,
        },
        {
          label: "Members",
          to: `/workspaces/${session.currentWorkspace.id}/members`,
        },
        {
          label: "Billable rates",
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id, "billable-rates"),
        },
        {
          label: "Invoices",
          to: `/workspaces/${session.currentWorkspace.id}/invoices`,
        },
        {
          label: "Tags",
          to: `/workspaces/${session.currentWorkspace.id}/tags`,
        },
        {
          label: "Goals",
          to: `/workspaces/${session.currentWorkspace.id}/goals`,
        },
        // Import: primary entry point for Toggl data migration — do not remove
        {
          label: "Import",
          to: `/workspaces/${session.currentWorkspace.id}/import`,
        },
        {
          label: "Integrations",
          to: `/workspaces/${session.currentWorkspace.id}/integrations`,
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          label: "Audit Log",
          to: `/workspaces/${session.currentWorkspace.id}/audit-log`,
        },
        {
          label: "Subscription",
          to: `/workspaces/${session.currentWorkspace.id}/subscription`,
        },
        {
          label: "Settings",
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
        },
        {
          label: "Instance Admin",
          to: "/instance-admin/overview",
        },
      ],
    },
  ];
}
