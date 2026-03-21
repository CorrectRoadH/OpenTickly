import { z } from "zod";

const positiveIntegerSearchParamSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value[0];
    }

    if (typeof value === "number") {
      return String(value);
    }

    return value;
  },
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value)),
);

const optionalProjectIdSchema = positiveIntegerSearchParamSchema.optional();

export type TasksSearch = {
  projectId?: unknown;
};

export function parseTasksSearch(search: TasksSearch | undefined): {
  projectId?: number;
} {
  const parsedProjectId = optionalProjectIdSchema.safeParse(search?.projectId);

  return {
    projectId: parsedProjectId.success ? parsedProjectId.data : undefined,
  };
}

export function buildWorkspaceTasksPath(input: {
  projectId?: number;
  workspaceId: number;
}): string {
  const basePath = `/workspaces/${input.workspaceId}/tasks`;
  const projectId = input.projectId;

  if (typeof projectId !== "number" || !Number.isInteger(projectId) || projectId <= 0) {
    return basePath;
  }

  const search = new URLSearchParams({
    projectId: String(projectId),
  });

  return `${basePath}?${search.toString()}`;
}
