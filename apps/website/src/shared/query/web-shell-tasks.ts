import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrapWebApiResult } from "../api/web-client.ts";
import { getWorkspaceTasksBasic, postWorkspaceProjectTasks } from "../api/public/track/index.ts";

export function useTasksQuery(workspaceId: number, projectId?: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceTasksBasic({
          path: {
            workspace_id: workspaceId,
          },
          query: {
            active: undefined,
            page: 1,
            per_page: 200,
            project_id: projectId,
            search: "",
            sort_field: "name",
            sort_order: "ASC",
          },
        }),
      ),
    queryKey: ["tasks", workspaceId, projectId ?? null],
  });
}

export function useCreateTaskMutation(workspaceId: number, projectId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (projectId == null) {
        throw new Error("Project-scoped task creation requires a project ID.");
      }
      await unwrapWebApiResult(
        postWorkspaceProjectTasks({
          body: {
            name,
          },
          path: {
            project_id: projectId,
            workspace_id: workspaceId,
          },
        }),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tasks", workspaceId],
      });
    },
  });
}
