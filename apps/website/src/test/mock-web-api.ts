import { onTestFinished, vi } from "vitest";

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

type ActiveFetchMock = {
  fetchMock: typeof fetch;
};

const nativeFetch = globalThis.fetch;
const activeFetchMocks: ActiveFetchMock[] = [];

function applyActiveFetch() {
  const activeMock = activeFetchMocks[activeFetchMocks.length - 1];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: activeMock?.fetchMock ?? nativeFetch,
    writable: true,
  });
}

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
  let restored = false;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input.toString() : input.url,
      "http://localhost",
    );
    const method = init?.method?.toUpperCase() ?? request?.method?.toUpperCase() ?? "GET";
    const rawBody =
      typeof init?.body === "string" ? init.body : request ? await request.clone().text() : null;
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
  const activeMock: ActiveFetchMock = {
    fetchMock: fetchMock as typeof fetch,
  };
  activeFetchMocks.push(activeMock);
  applyActiveFetch();
  const restore = () => {
    if (restored) {
      return;
    }
    restored = true;

    const activeIndex = activeFetchMocks.indexOf(activeMock);
    if (activeIndex === -1) {
      return;
    }
    activeFetchMocks.splice(activeIndex, 1);
    applyActiveFetch();
  };
  onTestFinished(restore);

  return {
    calls,
    fetchMock,
    restore,
  };
}
