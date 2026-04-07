import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import { useProjectsQuery, useTagsQuery } from "../../shared/query/web-shell.ts";
import { useSession, useSessionActions } from "../../shared/session/session-context.tsx";

export function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data.filter((project): project is GithubComTogglTogglApiInternalModelsProject =>
      Boolean(project && typeof project === "object" && "id" in project),
    );
  }
  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }
  if (hasProjectArray(data, "data")) {
    return data.data;
  }
  return [];
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

export function normalizeTags(data: unknown): { id: number; name: string }[] {
  if (Array.isArray(data)) {
    return data.filter((tag): tag is { id: number; name: string } =>
      Boolean(tag && typeof tag === "object" && "id" in tag && "name" in tag),
    );
  }
  if (hasTagArray(data, "tags")) {
    return data.tags;
  }
  if (hasTagArray(data, "data")) {
    return data.data;
  }
  return [];
}

function hasTagArray(
  value: unknown,
  key: "data" | "tags",
): value is Record<typeof key, { id: number; name: string }[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

export function useWorkspaceData() {
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const workspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";

  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const tagsQuery = useTagsQuery(workspaceId);

  const projectOptions = normalizeProjects(projectsQuery.data);
  const tagOptions = normalizeTags(tagsQuery.data);

  return {
    session,
    setCurrentWorkspaceId,
    workspaceId,
    timezone,
    projectOptions,
    tagOptions,
  };
}
