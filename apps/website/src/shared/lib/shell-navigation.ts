import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildWorkspaceGroupsPath,
  buildWorkspaceOverviewPath,
  buildWorkspacePermissionsPath,
  buildWorkspaceReportsPath,
  buildWorkspaceSettingsPathWithSection,
} from "./workspace-routing.ts";

export function shellNavigationItems(session: SessionBootstrapViewModel) {
  return [
    {
      label: "Overview",
      to: buildWorkspaceOverviewPath(session.currentWorkspace.id),
    },
    {
      label: "Reports",
      to: buildWorkspaceReportsPath(session.currentWorkspace.id),
    },
    {
      label: "Members",
      to: `/workspaces/${session.currentWorkspace.id}/members`,
    },
    {
      label: "Projects",
      to: `/workspaces/${session.currentWorkspace.id}/projects`,
    },
    {
      label: "Clients",
      to: `/workspaces/${session.currentWorkspace.id}/clients`,
    },
    {
      label: "Groups",
      to: buildWorkspaceGroupsPath(session.currentWorkspace.id),
    },
    {
      label: "Permissions",
      to: buildWorkspacePermissionsPath(session.currentWorkspace.id),
    },
    {
      label: "Tasks",
      to: `/workspaces/${session.currentWorkspace.id}/tasks`,
    },
    {
      label: "Tags",
      to: `/workspaces/${session.currentWorkspace.id}/tags`,
    },
    {
      label: "Profile",
      to: "/profile",
    },
    {
      label: "Settings",
      to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
    },
  ];
}
