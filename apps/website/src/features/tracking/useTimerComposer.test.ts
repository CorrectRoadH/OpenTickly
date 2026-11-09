import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vite-plus/test";
import { useTimerComposer } from "./useTimerComposer.ts";
import { useTimerViewStore } from "./store/timer-view-store.ts";

const { start } = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("./useWorkspaceData.ts", () => ({
  useWorkspaceData: () => ({ workspaceId: 1, setCurrentWorkspaceId: vi.fn() }),
}));
vi.mock("../../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => ({ data: null }),
  useSearchTimeEntriesQuery: () => ({ data: undefined }),
  useStartTimeEntryMutation: () => ({ mutateAsync: start, isPending: false }),
  useStopTimeEntryMutation: () => ({}),
  useUpdateTimeEntryMutation: () => ({}),
  useUpdateWebSessionMutation: () => ({}),
}));
const entry = {
  id: 5,
  description: "Review",
  project_id: 2,
  task_id: 3,
  tag_ids: [4],
  billable: true,
};
beforeEach(() => {
  start.mockReset().mockResolvedValue({});
  useTimerViewStore.getState().clearDraft();
  useTimerViewStore.getState().setTimerInputMode("automatic");
});
it("starts a fresh timer with all recent entry metadata", async () => {
  const { result } = renderHook(() => useTimerComposer());
  await act(() => result.current.handleSuggestedEntry(entry));
  expect(start).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      description: "Review",
      projectId: 2,
      taskId: 3,
      tagIds: [4],
      billable: true,
      start: expect.any(String),
    }),
  );
});
it("prefills manual mode without starting a live timer", async () => {
  useTimerViewStore.getState().setTimerInputMode("manual");
  const { result } = renderHook(() => useTimerComposer());
  await act(() => result.current.handleSuggestedEntry(entry));
  expect(start).not.toHaveBeenCalled();
  expect(useTimerViewStore.getState()).toMatchObject({
    draftDescription: "Review",
    draftProjectId: 2,
    draftTaskId: 3,
    draftTagIds: [4],
    draftBillable: true,
  });
});

it("does not start twice while a suggestion request is pending", async () => {
  let complete!: () => void;
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  start.mockReturnValue(pending);
  const { result } = renderHook(() => useTimerComposer());
  await act(async () => {
    const first = result.current.handleSuggestedEntry(entry);
    const second = result.current.handleSuggestedEntry(entry);
    complete();
    await Promise.all([first, second]);
  });
  expect(start).toHaveBeenCalledTimes(1);
});

it("retains the selected fields after failure and permits retry", async () => {
  start.mockRejectedValueOnce(new Error("Network failed"));
  const { result } = renderHook(() => useTimerComposer());
  await act(async () => {
    await expect(result.current.handleSuggestedEntry(entry)).rejects.toThrow("Network failed");
  });
  expect(useTimerViewStore.getState()).toMatchObject({
    draftDescription: "Review",
    draftProjectId: 2,
    draftTaskId: 3,
    draftTagIds: [4],
    draftBillable: true,
  });
  await act(() => result.current.handleSuggestedEntry(entry));
  expect(start).toHaveBeenCalledTimes(2);
});
