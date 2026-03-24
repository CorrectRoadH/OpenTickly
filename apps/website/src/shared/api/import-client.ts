import { client as generatedImportClient } from "./generated/import-api/client.gen.ts";
import type { ImportJob } from "./generated/import-api/types.gen.ts";

import { WebApiError } from "./web-client.ts";

type ImportApiResult<TResponse> = Promise<{
  data: TResponse | undefined;
  error: unknown;
  request: Request;
  response: Response;
}>;

export const importClient = generatedImportClient;

export async function createImportJobUpload({
  archive,
  workspaceId,
}: {
  archive: File;
  workspaceId: number;
}): Promise<ImportJob> {
  const formData = new FormData();
  formData.set("archive", archive);
  formData.set("source", "toggl_export_archive");
  formData.set("workspace_id", String(workspaceId));

  const response = await fetch("/import/v1/jobs", {
    body: formData,
    credentials: "same-origin",
    method: "POST",
  });

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    throw new WebApiError(`Request failed for ${response.url}`, response.status, data);
  }

  return (await response.json()) as ImportJob;
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
