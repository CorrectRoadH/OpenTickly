import { client as generatedWebClient } from "./web/index.ts";

generatedWebClient.setConfig({
  baseUrl: globalThis.location?.origin ?? "http://localhost",
  credentials: "same-origin",
});

export class WebApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "WebApiError";
    this.status = status;
    this.data = data;
  }
}

type WebApiResult<TResponse> = Promise<{
  data: TResponse | undefined;
  error: unknown;
  request: Request;
  response: Response;
}>;

export const webClient = generatedWebClient;

export async function unwrapWebApiResult<TResponse>(
  request: WebApiResult<TResponse>,
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
