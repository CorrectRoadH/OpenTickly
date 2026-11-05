import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GithubComTogglTogglApiInternalModelsProject,
  ModelsProjectGroup,
} from "../api/generated/public-track/types.gen.ts";
import {
  deleteProjectGroup,
  getProjectGroups,
  postProjectGroup,
  putWorkspaceProject,
} from "../api/public/track/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";

const projectGroupsQueryKey = (workspaceId: number) => ["project-groups", workspaceId] as const;

export function useProjectGroupsQuery(workspaceId: number, projectIds: number[]) {
  const ids = [...new Set(projectIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: [...projectGroupsQueryKey(workspaceId), ids],
    enabled: ids.length > 0,
    queryFn: () => unwrapWebApiResult(getProjectGroups({ workspaceId, projectIds: ids })),
  });
}

type TeamChange = {
  project: GithubComTogglTogglApiInternalModelsProject & { id: number };
  groupId: number | null;
  isPrivate: boolean;
};

export function useProjectTeamMutation(workspaceId: number) {
  const queryClient = useQueryClient();
  const path = { workspace_id: workspaceId };
  const add = (projectId: number, groupId: number) =>
    unwrapWebApiResult(
      postProjectGroup({
        path,
        body: { project_id: projectId, group_id: groupId },
      }),
    );
  const remove = (id: number) =>
    unwrapWebApiResult(
      deleteProjectGroup({
        path: { ...path, project_group_id: id },
      }),
    );
  const privacy = (projectId: number, isPrivate: boolean) =>
    unwrapWebApiResult(
      putWorkspaceProject({
        path: { ...path, project_id: projectId },
        body: { is_private: isPrivate },
      }),
    );

  return useMutation({
    mutationFn: async ({ project, groupId, isPrivate }: TeamChange) => {
      const existing = await unwrapWebApiResult(
        getProjectGroups({ workspaceId, projectIds: [project.id] }),
      );
      const removed: ModelsProjectGroup[] = [];
      let added = false;
      let privacyChanged = false;
      try {
        // Validate/create the requested association before changing visibility or
        // deleting the old team. A rejected assignment leaves the project intact.
        if (groupId !== null && !existing.some((group) => group.group_id === groupId)) {
          await add(project.id, groupId);
          added = true;
        }
        if ((project.is_private === true) !== isPrivate) {
          await privacy(project.id, isPrivate);
          privacyChanged = true;
        }
        for (const group of existing) {
          if (group.group_id !== groupId && group.id != null) {
            await remove(group.id);
            removed.push(group);
          }
        }
      } catch (error) {
        const rollbackErrors: unknown[] = [];
        const restore = async (operation: () => Promise<unknown>) => {
          try {
            await operation();
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        };
        for (const group of removed) {
          if (group.group_id != null) await restore(() => add(project.id, group.group_id!));
        }
        if (privacyChanged) await restore(() => privacy(project.id, project.is_private === true));
        if (added)
          await restore(async () => {
            const current = await unwrapWebApiResult(
              getProjectGroups({ workspaceId, projectIds: [project.id] }),
            );
            for (const group of current) {
              if (group.group_id === groupId && group.id != null) await remove(group.id);
            }
          });
        if (rollbackErrors.length)
          throw new AggregateError([error, ...rollbackErrors], "Project team rollback failed");
        throw error;
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: projectGroupsQueryKey(workspaceId) }),
      ]);
    },
  });
}
