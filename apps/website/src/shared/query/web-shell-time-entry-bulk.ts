import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TimeEntrySearchResult } from "../api/generated/web/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import { deleteWorkspaceTimeEntries, patchTimeEntries } from "../api/public/track/index.ts";
import { searchWorkspaceTimeEntries } from "../api/web/index.ts";

import { type BulkEditPatchOperation } from "./web-shell.ts";

const currentTimeEntryQueryKey = ["current-time-entry"] as const;

export function useBulkEditTimeEntriesMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      operations,
      timeEntryIds,
    }: {
      operations: BulkEditPatchOperation[];
      timeEntryIds: number[];
    }) =>
      unwrapWebApiResult(
        patchTimeEntries({
          body: operations,
          path: {
            time_entry_ids: timeEntryIds,
            workspace_id: workspaceId,
          },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useBulkDeleteTimeEntriesMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryIds: number[]) => {
      for (const timeEntryId of timeEntryIds) {
        await unwrapWebApiResult(
          deleteWorkspaceTimeEntries({
            path: {
              time_entry_id: timeEntryId,
              workspace_id: workspaceId,
            },
          }),
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useSearchTimeEntriesQuery(workspaceId: number, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        searchWorkspaceTimeEntries({
          path: { workspace_id: workspaceId },
          query: { query: trimmed },
        }),
      ) as Promise<TimeEntrySearchResult>,
    queryKey: ["time-entry-search", workspaceId, trimmed],
    enabled: trimmed.length > 0,
    staleTime: 5_000,
  });
}
