/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { MobileTimerComposer } from "./MobileTimerComposer.tsx";

const start = vi.fn();
const stop = vi.fn();
const useTimeEntriesQuery = vi.fn();

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../app/i18n.ts", () => ({
  default: { changeLanguage: vi.fn(), language: "en" },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useStartTimeEntryMutation: () => ({ isPending: false, mutateAsync: start }),
  useStopTimeEntryMutation: () => ({ isPending: false, mutateAsync: stop }),
  useTimeEntriesQuery: (...args: unknown[]) => useTimeEntriesQuery(...args),
}));

vi.mock("../../features/tracking/LiveDuration.tsx", () => ({
  LiveDuration: () => <span>duration</span>,
}));

function makeEntry(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    billable: false,
    description: "Recent work",
    duration: 60,
    id: 42,
    project_id: null,
    start: "2026-08-14T10:00:00Z",
    stop: "2026-08-14T10:01:00Z",
    tag_ids: [],
    task_id: null,
    wid: 10,
    workspace_id: 10,
    ...overrides,
  };
}

describe("MobileTimerComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimeEntriesQuery.mockReturnValue({ data: [], isSuccess: true });
  });

  test("preserves the draft and reports a failed timer start", async () => {
    start.mockRejectedValue(new Error("start failed"));
    render(<MobileTimerComposer runningEntry={null} workspaceId={10} />);

    const input = screen.getByPlaceholderText("whatAreYouWorkingOn");
    fireEvent.change(input, { target: { value: "Draft work" } });
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("failedToSaveTimeEntry"));
    expect(input).toHaveValue("Draft work");
  });

  test("clears the draft only after a successful timer start", async () => {
    start.mockResolvedValue(makeEntry({ stop: undefined }));
    render(<MobileTimerComposer runningEntry={null} workspaceId={10} />);

    const input = screen.getByPlaceholderText("whatAreYouWorkingOn");
    fireEvent.change(input, { target: { value: "Draft work" } });
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    await waitFor(() => expect(input).toHaveValue(""));
  });

  test("reports failed stop and continue actions", async () => {
    stop.mockRejectedValue(new Error("stop failed"));
    const runningEntry = makeEntry({ stop: undefined });
    const { rerender } = render(
      <MobileTimerComposer runningEntry={runningEntry} workspaceId={10} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop timer" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("failedToSaveTimeEntry"));

    start.mockRejectedValue(new Error("continue failed"));
    useTimeEntriesQuery.mockReturnValue({ data: [makeEntry()], isSuccess: true });
    rerender(<MobileTimerComposer runningEntry={null} workspaceId={10} />);
    fireEvent.click(screen.getByRole("button", { name: "continueEntry" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
  });
});
