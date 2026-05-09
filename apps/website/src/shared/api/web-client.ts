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

  get userMessage(): string {
    if (
      this.data != null &&
      typeof this.data === "object" &&
      "message" in this.data &&
      typeof (this.data as { message: unknown }).message === "string"
    ) {
      return (this.data as { message: string }).message;
    }
    return `Request failed (${this.status})`;
  }
}

type WebApiResult<TResponse> = Promise<{
  data: TResponse | undefined;
  error: unknown;
  request?: Request;
  response?: Response;
}>;

export const webClient = generatedWebClient;

export async function unwrapWebApiResult<TResponse>(
  request: WebApiResult<TResponse>,
): Promise<TResponse> {
  const result = await request;

  if (result.error !== undefined) {
    const status = result.response?.status ?? 0;
    const url = result.request?.url ?? "unknown request";
    throw new WebApiError(`Request failed for ${url}`, status, result.error);
  }

  return result.data as TResponse;
}
