import { useMutation, useQuery } from "@tanstack/react-query";

import { getImportJob } from "../api/import/index.ts";
import {
  createArchiveImportJobUpload,
  createTimeEntriesImportJobUpload,
  unwrapImportApiResult,
} from "../api/import-client.ts";

export function useCreateArchiveImportJobMutation() {
  return useMutation({
    mutationFn: async ({
      archive,
      organizationName,
    }: {
      archive: File;
      organizationName: string;
    }) => createArchiveImportJobUpload({ archive, organizationName }),
  });
}

export function useCreateTimeEntriesImportJobMutation() {
  return useMutation({
    mutationFn: async ({ archive, workspaceId }: { archive: File; workspaceId: number }) =>
      createTimeEntriesImportJobUpload({ archive, workspaceId }),
  });
}

export function useImportJobQuery(jobId: string | null) {
  return useQuery({
    enabled: Boolean(jobId),
    queryFn: () =>
      unwrapImportApiResult(
        getImportJob({
          path: {
            job_id: jobId as string,
          },
        }),
      ),
    queryKey: ["import-job", jobId],
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });
}
