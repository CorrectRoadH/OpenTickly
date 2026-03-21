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
