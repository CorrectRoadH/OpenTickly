import type { WorkspaceSettingsSection } from "../url-state/workspace-settings-location.ts";

export function buildOverviewPath(): string {
  return "/overview";
}

export function buildTimerPath(): string {
  return "/timer";
}

export function buildWorkspaceReportsPath(workspaceId: number): string {
  return `/workspaces/${workspaceId}/reports`;
}

export function buildWorkspaceGroupsPath(workspaceId: number): string {
  return `/workspaces/${workspaceId}/groups`;
}

export function buildWorkspacePermissionsPath(workspaceId: number): string {
  return `/workspaces/${workspaceId}/permissions`;
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

export function resolveHomePath(): string {
  return buildTimerPath();
}

export function swapWorkspaceInPath(pathname: string, workspaceId: number, search: string): string {
  const section = search ? `?${search.replace(/^\?/, "")}` : "";

  if (pathname === "/overview" || pathname === "/timer") {
    return `${pathname}${section}`;
  }

  if (/^\/workspaces\/\d+\/settings$/.test(pathname)) {
    return `/workspaces/${workspaceId}/settings${section}`;
  }

  if (/^\/workspaces\/\d+\/reports$/.test(pathname)) {
    return `/workspaces/${workspaceId}/reports${section}`;
  }

  if (/^\/workspaces\/\d+\/clients$/.test(pathname)) {
    return `/workspaces/${workspaceId}/clients${section}`;
  }

  if (/^\/workspaces\/\d+\/groups$/.test(pathname)) {
    return `/workspaces/${workspaceId}/groups${section}`;
  }

  if (/^\/workspaces\/\d+\/permissions$/.test(pathname)) {
    return `/workspaces/${workspaceId}/permissions${section}`;
  }

  if (/^\/workspaces\/\d+\/tasks$/.test(pathname)) {
    return `/workspaces/${workspaceId}/tasks${section}`;
  }

  if (/^\/workspaces\/\d+\/tags$/.test(pathname)) {
    return `/workspaces/${workspaceId}/tags${section}`;
  }

  return buildOverviewPath();
}
