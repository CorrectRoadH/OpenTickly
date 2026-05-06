import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../api/generated/public-track/types.gen.ts";

// ─── Mocks ───

const mockPatchStop = vi.fn();
const mockPutUpdate = vi.fn();
const mockPostCreate = vi.fn();
const mockDeleteTE = vi.fn();

vi.mock("../api/public/track/index.ts", () => ({
  patchWorkspaceStopTimeEntryHandler: (...args: unknown[]) => mockPatchStop(...args),
  putWorkspaceTimeEntryHandler: (...args: unknown[]) => mockPutUpdate(...args),
  postWorkspaceTimeEntries: (...args: unknown[]) => mockPostCreate(...args),
  deleteWorkspaceTimeEntries: (...args: unknown[]) => mockDeleteTE(...args),
  getCurrentTimeEntry: vi.fn(),
  getMe: vi.fn(),
  getOrganization: vi.fn(),
  getWorkspaceProjects: vi.fn(),
  getWorkspaceTags: vi.fn(),
  getWorkspaceClients: vi.fn(),
  getWorkspaceTasks: vi.fn(),
  getWorkspaceFavorites: vi.fn(),
  getWorkspaceMembers: vi.fn(),
  getMeTimeBetween: vi.fn(),
}));

vi.mock("../api/web-client.ts", () => ({
  unwrapWebApiResult: (p: Promise<unknown>) => p.then((r: any) => r?.data ?? r),
}));

vi.mock("../api/web-contract.ts", () => ({}));
vi.mock("../api/generated/public-reports/types.gen.ts", () => ({}));
vi.mock("../api/public/reports/index.ts", () => ({
  postReportsApiV3WorkspaceByWorkspaceIdWeeklyTimeEntries: vi.fn(),
}));
vi.mock("../api/public/web/index.ts", () => ({
  getWebSession: vi.fn(),
  postWebLogin: vi.fn(),
  deleteWebSession: vi.fn(),
  postWebRegister: vi.fn(),
  putWebSession: vi.fn(),
  getWebWorkspaceSettings: vi.fn(),
  putWebWorkspaceSettings: vi.fn(),
}));

// Import after mocks
const {
  useStopTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useStartTimeEntryMutation,
  useCreateTimeEntryMutation,
  useDeleteTimeEntryMutation,
} = await import("./web-shell.ts");

// ─── Test helpers ───

const WORKSPACE_ID = 123;

function makeTimeEntry(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: 1001,
    workspace_id: WORKSPACE_ID,
    wid: WORKSPACE_ID,
    description: "Working on feature",
    start: "2026-03-30T10:00:00Z",
    duration: -1, // running
    billable: false,
    tag_ids: [],
    project_id: null,
    task_id: null,
    ...overrides,
  };
}

/**
 * Renders a hook with a real QueryClient, returning the hook result and the client.
 * Simplified version — no React rendering needed since we test mutation behavior directly.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// We need renderHook from testing-library to use React Query hooks properly
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── Tests ───

describe("Offline optimistic mutations", () => {
  let queryClient: QueryClient;
  const runningEntry = makeTimeEntry();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  describe("useStopTimeEntryMutation", () => {
    it("optimistically clears current time entry before API responds", async () => {
      // Seed running entry in cache
      queryClient.setQueryData(["current-time-entry"], runningEntry);

      // API will hang (never resolve) to simulate offline
      mockPatchStop.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useStopTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      // Fire mutation — await act so onMutate microtask settles
      await act(async () => {
        result.current.mutate({
          timeEntryId: runningEntry.id!,
          workspaceId: WORKSPACE_ID,
        });
      });

      // Cache should be optimistically cleared immediately
      const cached = queryClient.getQueryData(["current-time-entry"]);
      expect(cached).toBeNull();
    });

    it("rolls back on error", async () => {
      queryClient.setQueryData(["current-time-entry"], runningEntry);

      mockPatchStop.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useStopTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            timeEntryId: runningEntry.id!,
            workspaceId: WORKSPACE_ID,
          });
        } catch {
          // expected
        }
      });

      // Should rollback to original entry (online)
      const cached = queryClient.getQueryData(["current-time-entry"]);
      expect(cached).toEqual(runningEntry);
    });

    it("does NOT rollback when offline (SW queued the request)", async () => {
      queryClient.setQueryData(["current-time-entry"], runningEntry);
      mockPatchStop.mockRejectedValue(new Error("Network error"));

      // Simulate offline
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

      const { result } = renderHook(() => useStopTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            timeEntryId: runningEntry.id!,
            workspaceId: WORKSPACE_ID,
          });
        } catch {
          // expected
        }
      });

      // Optimistic null should stick — no rollback
      const cached = queryClient.getQueryData(["current-time-entry"]);
      expect(cached).toBeNull();

      // Restore
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    });
  });

  describe("useUpdateTimeEntryMutation", () => {
    const stoppedEntry = makeTimeEntry({
      duration: 3600,
      stop: "2026-03-30T11:00:00Z",
    });

    it("optimistically applies updated fields before API responds", async () => {
      queryClient.setQueryData(["current-time-entry"], stoppedEntry);

      // API hangs
      mockPutUpdate.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useUpdateTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          request: {
            description: "Updated description",
            billable: true,
            tagIds: [10, 20],
          },
          timeEntryId: stoppedEntry.id!,
          workspaceId: WORKSPACE_ID,
        });
      });

      const cached = queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>([
        "current-time-entry",
      ]);
      expect(cached?.description).toBe("Updated description");
      expect(cached?.billable).toBe(true);
      expect(cached?.tag_ids).toEqual([10, 20]);
    });

    it("rolls back on error", async () => {
      queryClient.setQueryData(["current-time-entry"], stoppedEntry);

      mockPutUpdate.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useUpdateTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            request: { description: "Should rollback" },
            timeEntryId: stoppedEntry.id!,
            workspaceId: WORKSPACE_ID,
          });
        } catch {
          // expected
        }
      });

      const cached = queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>([
        "current-time-entry",
      ]);
      expect(cached?.description).toBe("Working on feature");
    });

    it("sends null project_id when clearing an existing project", async () => {
      mockPutUpdate.mockResolvedValue({
        data: makeTimeEntry({
          id: stoppedEntry.id,
          duration: stoppedEntry.duration,
          project_id: null,
          stop: stoppedEntry.stop,
        }),
      });

      const { result } = renderHook(() => useUpdateTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          request: { projectId: null },
          timeEntryId: stoppedEntry.id!,
          workspaceId: WORKSPACE_ID,
        });
      });

      expect(mockPutUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            project_id: null,
          }),
        }),
      );
    });
  });

  describe("useStartTimeEntryMutation", () => {
    it("optimistically creates a running entry before API responds", async () => {
      queryClient.setQueryData(["current-time-entry"], null);

      // API hangs
      mockPostCreate.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useStartTimeEntryMutation(WORKSPACE_ID), {
        wrapper: createWrapper(queryClient),
      });

      const startTime = "2026-03-30T12:00:00Z";

      await act(async () => {
        result.current.mutate({
          description: "New task",
          start: startTime,
        });
      });

      const cached = queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>([
        "current-time-entry",
      ]);
      expect(cached).not.toBeNull();
      expect(cached?.description).toBe("New task");
      expect(cached?.duration).toBe(-1); // running
      expect(cached?.start).toBe(startTime);
      expect(cached?.workspace_id).toBe(WORKSPACE_ID);
    });

    it("rolls back on error", async () => {
      queryClient.setQueryData(["current-time-entry"], null);

      mockPostCreate.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useStartTimeEntryMutation(WORKSPACE_ID), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            description: "Should rollback",
            start: "2026-03-30T12:00:00Z",
          });
        } catch {
          // expected
        }
      });

      const cached = queryClient.getQueryData(["current-time-entry"]);
      expect(cached).toBeNull();
    });
  });

  describe("useDeleteTimeEntryMutation", () => {
    const entry1 = makeTimeEntry({ id: 1001, description: "Entry 1", duration: 3600 });
    const entry2 = makeTimeEntry({ id: 1002, description: "Entry 2", duration: 1800 });

    it("optimistically removes entry from time-entries list", async () => {
      const listKey = ["time-entries", null, null, false];
      queryClient.setQueryData(listKey, [entry1, entry2]);
      queryClient.setQueryData(["current-time-entry"], null);

      mockDeleteTE.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useDeleteTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          timeEntryId: entry1.id!,
          workspaceId: WORKSPACE_ID,
        });
      });

      const cached =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
      expect(cached).toHaveLength(1);
      expect(cached![0].id).toBe(1002);
    });

    it("optimistically clears current entry if deleting the running one", async () => {
      queryClient.setQueryData(["current-time-entry"], runningEntry);

      mockDeleteTE.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useDeleteTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          timeEntryId: runningEntry.id!,
          workspaceId: WORKSPACE_ID,
        });
      });

      const cached = queryClient.getQueryData(["current-time-entry"]);
      expect(cached).toBeNull();
    });

    it("rolls back on error when online", async () => {
      const listKey = ["time-entries", null, null, false];
      queryClient.setQueryData(listKey, [entry1, entry2]);
      queryClient.setQueryData(["current-time-entry"], null);

      mockDeleteTE.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useDeleteTimeEntryMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            timeEntryId: entry1.id!,
            workspaceId: WORKSPACE_ID,
          });
        } catch {
          // expected
        }
      });

      const cached =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
      expect(cached).toHaveLength(2);
    });
  });

  describe("useCreateTimeEntryMutation", () => {
    it("optimistically adds entry to time-entries list", async () => {
      const existing = makeTimeEntry({ id: 1001, duration: 3600 });
      const listKey = ["time-entries", null, null, false];
      queryClient.setQueryData(listKey, [existing]);
      queryClient.setQueryData(["current-time-entry"], null);

      mockPostCreate.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useCreateTimeEntryMutation(WORKSPACE_ID), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          description: "Manual entry",
          duration: 1800,
          start: "2026-03-30T08:00:00Z",
          stop: "2026-03-30T08:30:00Z",
        });
      });

      const cached =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
      expect(cached).toHaveLength(2);
      expect(cached!.some((e) => e.description === "Manual entry")).toBe(true);
    });

    it("rolls back on error when online", async () => {
      const listKey = ["time-entries", null, null, false];
      queryClient.setQueryData(listKey, []);
      queryClient.setQueryData(["current-time-entry"], null);

      mockPostCreate.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useCreateTimeEntryMutation(WORKSPACE_ID), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            description: "Should rollback",
            duration: 1800,
            start: "2026-03-30T08:00:00Z",
            stop: "2026-03-30T08:30:00Z",
          });
        } catch {
          // expected
        }
      });

      const cached =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
      expect(cached).toHaveLength(0);
    });

    it("invalidates project rollups after a confirmed create", async () => {
      mockPostCreate.mockResolvedValue({
        data: makeTimeEntry({
          id: 2001,
          duration: 1800,
          start: "2026-03-30T08:00:00Z",
          stop: "2026-03-30T08:30:00Z",
        }),
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateTimeEntryMutation(WORKSPACE_ID), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          description: "Manual entry",
          duration: 1800,
          start: "2026-03-30T08:00:00Z",
          stop: "2026-03-30T08:30:00Z",
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects", WORKSPACE_ID] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project-detail"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project-statistics"] });
    });
  });
});

/**
 * Same-tick optimistic-write assertions.
 *
 * The tests above use `await act(...)` which drains microtasks, so an
 * optimistic write happening one microtask late still "looks" instant.
 * That hides the "慢一拍" bug on mobile: if onMutate is `async () => {
 * await cancelQueries(); setQueryData(...); }`, the cache update is
 * deferred to the next microtask and the re-render misses the current
 * event turn.
 *
 * These tests fire `.mutate()` with NO act and NO await, then read the
 * cache synchronously. They pass only when the optimistic write runs in
 * the synchronous prefix of onMutate (setQueryData FIRST; cancelQueries
 * in the background via `void`).
 */
describe("Optimistic writes must land in the same synchronous tick", () => {
  let queryClient: QueryClient;
  const runningEntry = makeTimeEntry();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    // All mutations hang so no onSuccess runs during the assertion.
    mockPatchStop.mockReturnValue(new Promise(() => {}));
    mockPutUpdate.mockReturnValue(new Promise(() => {}));
    mockPostCreate.mockReturnValue(new Promise(() => {}));
    mockDeleteTE.mockReturnValue(new Promise(() => {}));
  });

  it("Start writes the optimistic running entry before mutate() returns", () => {
    queryClient.setQueryData(["current-time-entry"], null);
    const { result } = renderHook(() => useStartTimeEntryMutation(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ description: "New task", start: "2026-03-30T12:00:00Z" });

    const cached = queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>([
      "current-time-entry",
    ]);
    expect(cached).not.toBeNull();
    expect(cached?.description).toBe("New task");
  });

  it("Stop clears the current entry before mutate() returns", () => {
    queryClient.setQueryData(["current-time-entry"], runningEntry);
    const { result } = renderHook(() => useStopTimeEntryMutation(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ timeEntryId: runningEntry.id!, workspaceId: WORKSPACE_ID });

    expect(queryClient.getQueryData(["current-time-entry"])).toBeNull();
  });

  it("Update patches the current entry before mutate() returns", () => {
    const stoppedEntry = makeTimeEntry({ duration: 3600, stop: "2026-03-30T11:00:00Z" });
    queryClient.setQueryData(["current-time-entry"], stoppedEntry);
    const { result } = renderHook(() => useUpdateTimeEntryMutation(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      request: { description: "Updated description" },
      timeEntryId: stoppedEntry.id!,
      workspaceId: WORKSPACE_ID,
    });

    const cached = queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>([
      "current-time-entry",
    ]);
    expect(cached?.description).toBe("Updated description");
  });

  it("Create prepends the optimistic entry to the list before mutate() returns", () => {
    const existing = makeTimeEntry({ id: 1001, duration: 3600 });
    const listKey = ["time-entries", null, null, false];
    queryClient.setQueryData(listKey, [existing]);
    const { result } = renderHook(() => useCreateTimeEntryMutation(WORKSPACE_ID), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      description: "Manual entry",
      duration: 1800,
      start: "2026-03-30T08:00:00Z",
      stop: "2026-03-30T08:30:00Z",
    });

    const cached =
      queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
    expect(cached).toHaveLength(2);
    expect(cached![0].description).toBe("Manual entry");
  });

  it("Delete removes the entry from the list before mutate() returns", () => {
    const entry1 = makeTimeEntry({ id: 1001, description: "Entry 1" });
    const entry2 = makeTimeEntry({ id: 1002, description: "Entry 2" });
    const listKey = ["time-entries", null, null, false];
    queryClient.setQueryData(listKey, [entry1, entry2]);
    queryClient.setQueryData(["current-time-entry"], null);
    const { result } = renderHook(() => useDeleteTimeEntryMutation(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ timeEntryId: entry1.id!, workspaceId: WORKSPACE_ID });

    const cached =
      queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(listKey);
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe(1002);
  });
});
