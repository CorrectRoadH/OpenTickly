/* @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetTimeEntries = vi.fn();
const mockUpdateWebSession = vi.fn();

vi.mock("../api/public/track/index.ts", () => ({
  deleteWorkspaceTimeEntries: vi.fn(),
  getCurrentTimeEntry: vi.fn(),
  getTimeEntries: (...args: unknown[]) => mockGetTimeEntries(...args),
  patchWorkspaceStopTimeEntryHandler: vi.fn(),
  postWorkspaceTimeEntries: vi.fn(),
  putWorkspaceTimeEntryHandler: vi.fn(),
}));

vi.mock("../api/web/index.ts", () => ({
  listRecentWorkspaceTimeEntrySuggestions: vi.fn(),
  updateWebSession: (...args: unknown[]) => mockUpdateWebSession(...args),
}));

vi.mock("../api/web-client.ts", () => ({
  unwrapWebApiResult: (p: Promise<unknown>) =>
    p.then((result) =>
      typeof result === "object" && result !== null && "data" in result
        ? (result as { data: unknown }).data
        : result,
    ),
}));

const { sessionQueryKey, timeEntriesQueryKey, useTimeEntriesQuery } =
  await import("./web-shell.ts");

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("timeEntriesQueryKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes time entry lists by workspace", () => {
    expect(timeEntriesQueryKey(1, "2026-05-01", "2026-05-07", false)).not.toEqual(
      timeEntriesQueryKey(2, "2026-05-01", "2026-05-07", false),
    );
  });

  it("aligns the server session workspace before reading /me time entries", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      current_workspace_id: 1,
    });
    mockUpdateWebSession.mockResolvedValue({
      data: {
        current_workspace_id: 2,
      },
    });
    mockGetTimeEntries.mockResolvedValue({ data: [] });

    renderHook(
      () =>
        useTimeEntriesQuery({
          endDate: "2026-05-07",
          startDate: "2026-05-01",
          workspaceId: 2,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(mockGetTimeEntries).toHaveBeenCalledTimes(1));
    expect(mockUpdateWebSession).toHaveBeenCalledWith({
      body: {
        workspace_id: 2,
      },
    });
    expect(mockGetTimeEntries.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockUpdateWebSession.mock.invocationCallOrder[0],
    );
    expect(queryClient.getQueryData(sessionQueryKey)).toEqual({
      current_workspace_id: 2,
    });
  });

  it("does not update the server session when the workspace is already current", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      current_workspace_id: 2,
    });
    mockGetTimeEntries.mockResolvedValue({ data: [] });

    renderHook(
      () =>
        useTimeEntriesQuery({
          endDate: "2026-05-07",
          startDate: "2026-05-01",
          workspaceId: 2,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(mockGetTimeEntries).toHaveBeenCalledTimes(1));
    expect(mockUpdateWebSession).not.toHaveBeenCalled();
  });
});
