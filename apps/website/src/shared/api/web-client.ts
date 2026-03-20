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

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function webRequest<TResponse>(
  path: string,
  options?: RequestOptions,
): Promise<TResponse> {
  const requestHeaders = new Headers(options?.headers);
  requestHeaders.set("Content-Type", "application/json");

  const response = await fetch(path, {
    credentials: "same-origin",
    headers: requestHeaders,
    ...options,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new WebApiError(`Request failed for ${path}`, response.status, payload);
  }

  return payload as TResponse;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
