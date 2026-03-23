import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { WorkspaceTimerPage } from "./WorkspaceTimerPage.tsx";

const mockUseSession = vi.fn();
const mockUseCurrentTimeEntryQuery = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseStartTimeEntryMutation = vi.fn();
const mockUseStopTimeEntryMutation = vi.fn();
const mockUseTimeEntriesQuery = vi.fn();
const mockUseTagsQuery = vi.fn();
const mockUseUpdateTimeEntryMutation = vi.fn();

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => mockUseCurrentTimeEntryQuery(),
  useProjectsQuery: () => mockUseProjectsQuery(),
  useStartTimeEntryMutation: () => mockUseStartTimeEntryMutation(),
  useStopTimeEntryMutation: () => mockUseStopTimeEntryMutation(),
  useTimeEntriesQuery: () => mockUseTimeEntriesQuery(),
  useTagsQuery: () => mockUseTagsQuery(),
  useUpdateTimeEntryMutation: () => mockUseUpdateTimeEntryMutation(),
}));

describe("WorkspaceTimerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSession.mockReturnValue({
      currentWorkspace: {
        id: 202,
      },
      user: {
        timezone: "UTC",
      },
    });

    mockUseStartTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseProjectsQuery.mockReturnValue({
      data: [],
    });
    mockUseStopTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseTagsQuery.mockReturnValue({
      data: [],
    });
    mockUseUpdateTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it("keeps the running timer composer separate from the clicked calendar entry editor", () => {
    const today = new Date();
    const day = String(today.getUTCDate()).padStart(2, "0");
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const year = today.getUTCFullYear();
    const historicalEntry = createTimeEntryFixture({
      description: "Review calendar click bug",
      id: 301,
      start: `${year}-${month}-${day}T10:00:00Z`,
      stop: `${year}-${month}-${day}T10:30:00Z`,
    });
    const runningEntry = createTimeEntryFixture({
      description: "Current running timer",
      duration: -1,
      id: 999,
      start: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      stop: undefined,
    });

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: runningEntry,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [historicalEntry],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    expect(screen.getByPlaceholderText("What are you working on?")).toHaveValue(
      "Current running timer",
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Review calendar click bug" }));

    expect(screen.getByTestId("time-entry-editor-dialog")).toBeVisible();
    expect(screen.getByDisplayValue("Review calendar click bug")).toBeVisible();
    expect(screen.getByPlaceholderText("What are you working on?")).toHaveValue(
      "Current running timer",
    );
  });
});

function createTimeEntryFixture(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    billable: false,
    description: "Fixture entry",
    duration: 1800,
    id: 12,
    project_color: "#c67abc",
    project_id: 44,
    project_name: "Waste time",
    start: "2026-03-23T10:00:00Z",
    stop: "2026-03-23T10:30:00Z",
    tags: ["4 条限"],
    workspace_id: 202,
    ...overrides,
  };
}
