import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";
import type { WorkspaceSettingsSection } from "../url-state/workspace-settings-location.ts";

export function buildWorkspaceOverviewPath(workspaceId: number): string {
  return `/workspaces/${workspaceId}`;
}

export function buildWorkspaceReportsPath(workspaceId: number): string {
  return `/workspaces/${workspaceId}/reports`;
}

export function buildWorkspaceSettingsPathWithSection(
  workspaceId: number,
  section: WorkspaceSettingsSection = "general",
): string {
  const search = new URLSearchParams({
    section,
  });

  return `/workspaces/${workspaceId}/settings?${search.toString()}`;
}

export function buildOrganizationSettingsPath(organizationId: number): string {
  return `/organizations/${organizationId}/settings`;
}

export function resolveHomePath(session: SessionBootstrapViewModel): string {
  return buildWorkspaceOverviewPath(session.currentWorkspace.id);
}

export function swapWorkspaceInPath(pathname: string, workspaceId: number, search: string): string {
  const section = search ? `?${search.replace(/^\?/, "")}` : "";

  if (/^\/workspaces\/\d+\/settings$/.test(pathname)) {
    return `/workspaces/${workspaceId}/settings${section}`;
  }

  if (/^\/workspaces\/\d+\/reports$/.test(pathname)) {
    return `/workspaces/${workspaceId}/reports${section}`;
  }

  if (/^\/workspaces\/\d+$/.test(pathname)) {
    return `/workspaces/${workspaceId}${section}`;
  }

  return buildWorkspaceOverviewPath(workspaceId);
}
