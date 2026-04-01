import type { WorkspaceSettingsSection } from "../url-state/workspace-settings-location.ts";
import { buildProjectsListPath } from "../url-state/projects-location.ts";
import { buildWorkspaceSettingsPath } from "../url-state/workspace-settings-location.ts";

export function buildOverviewPath(): string {
  return "/overview";
}

export function buildTimerPath(): string {
  return "/timer";
}

export type ReportsTab = "summary" | "detailed" | "workload" | "profitability" | "custom";

export function buildWorkspaceReportsPath(
  workspaceId: number,
  tab: ReportsTab = "summary",
): string {
  return `/workspaces/${workspaceId}/reports/${tab}`;
}

export function buildWorkspaceImportPath(_workspaceId?: number): string {
  return "/import";
}

export function buildProjectsPath(workspaceId: number): string {
  return buildProjectsListPath(workspaceId);
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
  return buildWorkspaceSettingsPath({
    section,
    workspaceId,
  });
}

export function buildOrganizationSettingsPath(organizationId: number): string {
  return `/organizations/${organizationId}/settings`;
}

export function resolveHomePath(): string {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return "/m/timer";
  }
  return buildTimerPath();
}

export function swapWorkspaceInPath(pathname: string, workspaceId: number, search: string): string {
  const section = search ? `?${search.replace(/^\?/, "")}` : "";

  if (pathname === "/overview" || pathname === "/timer") {
    return `${pathname}${section}`;
  }

  if (/^\/\d+\/settings\/[^/]+$/.test(pathname)) {
    return pathname.replace(/^\/\d+/, `/${workspaceId}`);
  }

  if (/^\/workspaces\/\d+\/settings$/.test(pathname)) {
    return buildWorkspaceSettingsPath({
      section: "general",
      workspaceId,
    });
  }

  if (/^\/workspaces\/\d+\/reports(\/[a-z]+)?$/.test(pathname)) {
    const tabMatch = pathname.match(/\/reports\/([a-z]+)$/);
    const tab = tabMatch ? tabMatch[1] : "summary";
    return `/workspaces/${workspaceId}/reports/${tab}${section}`;
  }

  if (pathname === "/import") {
    return `/import${section}`;
  }

  if (/^\/workspaces\/\d+\/import$/.test(pathname)) {
    return `/import${section}`;
  }

  if (/^\/projects\/\d+\/list$/.test(pathname)) {
    return `${buildProjectsListPath(workspaceId)}${section}`;
  }

  if (/^\/\d+\/projects\/\d+\/(dashboard|team)$/.test(pathname)) {
    return pathname.replace(/^\/\d+/, `/${workspaceId}`);
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
