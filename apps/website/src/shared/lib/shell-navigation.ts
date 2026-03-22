import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildWorkspaceGroupsPath,
  buildWorkspaceOverviewPath,
  buildWorkspacePermissionsPath,
  buildWorkspaceReportsPath,
  buildWorkspaceSettingsPathWithSection,
} from "./workspace-routing.ts";

export type ShellNavigationSection = {
  items: Array<{
    label: string;
    to: string;
  }>;
  title: string;
};

export function shellNavigationItems(session: SessionBootstrapViewModel): ShellNavigationSection[] {
  return [
    {
      title: "Track",
      items: [
        {
          label: "Time entries",
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
          label: "Groups",
          to: buildWorkspaceGroupsPath(session.currentWorkspace.id),
        },
        {
          label: "Tasks",
          to: `/workspaces/${session.currentWorkspace.id}/tasks`,
        },
        {
          label: "Tags",
          to: `/workspaces/${session.currentWorkspace.id}/tags`,
        },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          label: "Permissions",
          to: buildWorkspacePermissionsPath(session.currentWorkspace.id),
        },
        {
          label: "Profile",
          to: "/profile",
        },
        {
          label: "Settings",
          to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
        },
      ],
    },
  ];
}
