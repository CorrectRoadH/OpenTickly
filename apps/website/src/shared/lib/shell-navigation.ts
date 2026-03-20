import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import {
  buildWorkspaceOverviewPath,
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
      label: "Profile",
      to: "/profile",
    },
    {
      label: "Settings",
      to: buildWorkspaceSettingsPathWithSection(session.currentWorkspace.id),
    },
  ];
}
