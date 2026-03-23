import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import type { ProjectStatusFilter } from "../../shared/url-state/projects-location.ts";

export function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data as GithubComTogglTogglApiInternalModelsProject[];
  }

  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }

  if (hasProjectArray(data, "data")) {
    return data.data;
  }

  return [];
}

export function formatProjectHours(project: GithubComTogglTogglApiInternalModelsProject): string {
  const seconds = project.actual_seconds ?? Math.round((project.actual_hours ?? 0) * 3600);
  return `${Math.round((seconds / 3600) * 10) / 10 || 0} h`;
}

export function emptyProjectsStateTitle(statusFilter: ProjectStatusFilter): string {
  if (statusFilter === "archived") {
    return "No archived projects in this workspace yet.";
  }

  if (statusFilter === "active") {
    return "No active projects match this view.";
  }

  return "No projects in this workspace yet.";
}

function hasProjectArray(
  value: unknown,
  key: "data" | "projects",
): value is Record<typeof key, GithubComTogglTogglApiInternalModelsProject[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
