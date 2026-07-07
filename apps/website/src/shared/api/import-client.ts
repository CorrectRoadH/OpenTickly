import { client as generatedImportClient } from "./generated/import-api/client.gen.ts";
import type { ImportJob, ImportJobCreateRequest } from "./generated/import-api/types.gen.ts";

import { createImportJob } from "./import/index.ts";
import { WebApiError } from "./web-client.ts";

type ImportApiResult<TResponse> = Promise<{
  data: TResponse | undefined;
  error: unknown;
  request: Request;
  response: Response;
}>;

export const importClient = generatedImportClient;

export async function createArchiveImportJobUpload({
  archive,
  organizationName,
}: {
  archive: File;
  organizationName: string;
}): Promise<ImportJob> {
  return submitImportJob({
    archive,
    organization_name: organizationName,
    source: "toggl_export_archive",
  });
}

export async function createTimeEntriesImportJobUpload({
  archive,
  workspaceId,
}: {
  archive: File;
  workspaceId: number;
}): Promise<ImportJob> {
  return submitImportJob({
    archive,
    source: "time_entries_csv",
    workspace_id: workspaceId,
  });
}

async function submitImportJob(body: ImportJobCreateRequest): Promise<ImportJob> {
  return unwrapImportApiResult(createImportJob({ body }));
}

export async function unwrapImportApiResult<TResponse>(
  request: ImportApiResult<TResponse>,
): Promise<TResponse> {
  const result = await request;

  if (result.error !== undefined) {
    throw new WebApiError(
      `Request failed for ${result.request.url}`,
      result.response.status,
      result.error,
    );
  }

  return result.data as TResponse;
}
