import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { WorkspaceTimerPage } from "./WorkspaceTimerPage.tsx";

const mockUseSession = vi.fn();
const mockUseSessionActions = vi.fn();
const mockUseCurrentTimeEntryQuery = vi.fn();
const mockUseCreateProjectMutation = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseStartTimeEntryMutation = vi.fn();
const mockUseStopTimeEntryMutation = vi.fn();
const mockUseTimeEntriesQuery = vi.fn();
const mockUseTagsQuery = vi.fn();
const mockUseUpdateTimeEntryMutation = vi.fn();

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
  useSessionActions: () => mockUseSessionActions(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => mockUseCurrentTimeEntryQuery(),
  useCreateProjectMutation: () => mockUseCreateProjectMutation(),
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
      availableWorkspaces: [
        {
          id: 202,
          isCurrent: true,
          name: "North Ridge Delivery",
        },
      ],
      currentWorkspace: {
        id: 202,
        isAdmin: true,
        name: "North Ridge Delivery",
        onlyAdminsMayCreateProjects: false,
      },
      user: {
        timezone: "UTC",
      },
    });
    mockUseSessionActions.mockReturnValue({
      setCurrentWorkspaceId: vi.fn(),
    });

    mockUseCreateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
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

    const runningDescriptionInput = screen.getByPlaceholderText(
      "What are you working on?",
    ) as HTMLInputElement;

    expect(runningDescriptionInput.value).toBe("Current running timer");

    fireEvent.click(screen.getByRole("button", { name: "Edit Review calendar click bug" }));

    expect(screen.getByTestId("time-entry-editor-dialog")).toBeTruthy();
    expect(screen.getByDisplayValue("Review calendar click bug")).toBeTruthy();
    expect(runningDescriptionInput.value).toBe("Current running timer");
  });

  it("lets the running timer description stay editable and saves it on blur", async () => {
    const updateTimeEntry = vi.fn();
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
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });
    mockUseUpdateTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateTimeEntry,
    });

    render(<WorkspaceTimerPage />);

    const descriptionInput = screen.getByPlaceholderText(
      "What are you working on?",
    ) as HTMLInputElement;

    expect(descriptionInput.disabled).toBe(false);

    fireEvent.change(descriptionInput, {
      target: { value: "Updated running timer description" },
    });

    expect(descriptionInput.value).toBe("Updated running timer description");

    fireEvent.blur(descriptionInput);

    await waitFor(() => {
      expect(updateTimeEntry).toHaveBeenCalledWith({
        request: {
          description: "Updated running timer description",
        },
        timeEntryId: 999,
        workspaceId: 202,
      });
    });
  });

  it("closes the editor after saving a calendar entry", async () => {
    const today = new Date();
    const day = String(today.getUTCDate()).padStart(2, "0");
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const year = today.getUTCFullYear();
    const historicalEntry = createTimeEntryFixture({
      description: "Polish timer details",
      id: 302,
      start: `${year}-${month}-${day}T12:00:00Z`,
      stop: `${year}-${month}-${day}T12:30:00Z`,
    });
    const updateTimeEntry = vi.fn().mockResolvedValue({
      ...historicalEntry,
      description: "Polish timer details",
    });

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [historicalEntry],
      error: null,
      isError: false,
      isPending: false,
    });
    mockUseUpdateTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: updateTimeEntry,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Polish timer details" }));
    fireEvent.click(
      within(screen.getByTestId("time-entry-editor-dialog")).getByRole("button", { name: "Save" }),
    );

    await waitFor(() => {
      expect(updateTimeEntry).toHaveBeenCalled();
      expect(screen.queryByTestId("time-entry-editor-dialog")).toBeNull();
    });
  });

  it("treats the running start line like clicking the current running entry and closes after stop", async () => {
    const stopTimeEntry = vi.fn().mockResolvedValue({
      ...createTimeEntryFixture(),
      duration: 1800,
      id: 999,
      stop: new Date().toISOString(),
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
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });
    mockUseStopTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: stopTimeEntry,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Current running timer" }));

    expect(screen.getByTestId("time-entry-editor-dialog")).toBeTruthy();
    fireEvent.click(
      within(screen.getByTestId("time-entry-editor-dialog")).getByRole("button", {
        name: "Stop timer",
      }),
    );

    await waitFor(() => {
      expect(stopTimeEntry).toHaveBeenCalledWith({
        timeEntryId: 999,
        workspaceId: 202,
      });
      expect(screen.queryByTestId("time-entry-editor-dialog")).toBeNull();
    });
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
