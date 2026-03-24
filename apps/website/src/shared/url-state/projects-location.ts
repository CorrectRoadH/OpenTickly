import { z } from "zod";

const projectStatusFilterSchema = z.enum(["active", "all", "archived"]);

export type ProjectStatusFilter = z.infer<typeof projectStatusFilterSchema>;

export type ProjectsSearch = {
  status?: unknown;
};

export function parseProjectsSearch(search: ProjectsSearch | undefined): {
  status: ProjectStatusFilter;
} {
  const parsedStatus = projectStatusFilterSchema.safeParse(search?.status);

  return {
    status: parsedStatus.success ? parsedStatus.data : "all",
  };
}

export function buildProjectsListPath(workspaceId: number): string {
  return `/projects/${workspaceId}/list`;
}

export function buildProjectTeamPath(workspaceId: number, projectId: number): string {
  return `/${workspaceId}/projects/${projectId}/team`;
}

export function buildProjectDashboardPath(workspaceId: number, projectId: number): string {
  return `/${workspaceId}/projects/${projectId}/dashboard`;
}
