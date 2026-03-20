import { afterEach, vi } from "vitest";

type MockCall = {
  body: unknown;
  method: string;
  pathname: string;
};

type MockRequest = MockCall & {
  search: string;
};

type MockHandler = {
  method?: string;
  path: RegExp | string;
  resolver: (request: MockRequest) => Promise<Response> | Response;
};

function toResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return toResponse(body, init);
}

export function emptyResponse(init?: ResponseInit): Response {
  return new Response(null, init);
}

export function installMockWebApi(handlers: MockHandler[]) {
  const calls: MockCall[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input.toString() : input.url,
      "http://localhost",
    );
    const method = init?.method?.toUpperCase() ?? "GET";
    const rawBody = typeof init?.body === "string" ? init.body : null;
    const body = rawBody ? JSON.parse(rawBody) : undefined;

    calls.push({
      body,
      method,
      pathname: url.pathname,
    });

    const handler = handlers.find((candidate) => {
      const matchesMethod = (candidate.method ?? "GET").toUpperCase() === method;
      const matchesPath =
        typeof candidate.path === "string"
          ? candidate.path === url.pathname
          : candidate.path.test(url.pathname);

      return matchesMethod && matchesPath;
    });

    if (!handler) {
      return new Response(`Unhandled ${method} ${url.pathname}`, {
        status: 500,
      });
    }

    return handler.resolver({
      body,
      method,
      pathname: url.pathname,
      search: url.search,
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    calls,
    fetchMock,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});
