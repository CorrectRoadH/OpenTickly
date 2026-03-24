import { useMutation, useQuery } from "@tanstack/react-query";

import { getImportJob } from "../api/import/index.ts";
import { createImportJobUpload, unwrapImportApiResult } from "../api/import-client.ts";

export function useCreateImportJobMutation() {
  return useMutation({
    mutationFn: async ({
      archive,
      workspaceId,
    }: {
      archive: File;
      workspaceId: number;
    }) => createImportJobUpload({ archive, workspaceId }),
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
