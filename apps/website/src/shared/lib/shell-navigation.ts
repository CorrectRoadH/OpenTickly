import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildWorkspaceOverviewPath,
  buildWorkspaceReportsPath,
  buildWorkspaceSettingsPathWithSection,
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
          to: buildWorkspaceOverviewPath(session.currentWorkspace.id),
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
          disabled: true,
          label: "Approvals",
        },
      ],
    },
    {
      title: "Manage",
      items: [
        {
          label: "Projects",
          to: `/workspaces/${session.currentWorkspace.id}/projects`,
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
          disabled: true,
          label: "Invoices",
        },
        {
          label: "Tags",
          to: `/workspaces/${session.currentWorkspace.id}/tags`,
        },
        {
          disabled: true,
          label: "Goals",
        },
        {
          disabled: true,
          label: "Integrations",
          badge: "NEW",
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          disabled: true,
          label: "Subscription",
        },
        {
          label: "Settings",
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
        },
      ],
    },
  ];
}
