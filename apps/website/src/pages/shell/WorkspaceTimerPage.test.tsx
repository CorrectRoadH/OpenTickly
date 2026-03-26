import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { WorkspaceTimerPage } from "./WorkspaceTimerPage.tsx";

const mockUseSession = vi.fn();
const mockUseSessionActions = vi.fn();
const mockUseCurrentTimeEntryQuery = vi.fn();
const mockUseCreateTagMutation = vi.fn();
const mockUseCreateProjectMutation = vi.fn();
const mockUseCreateTimeEntryMutation = vi.fn();
const mockUseCreateWorkspaceFavoriteMutation = vi.fn();
const mockUseDeleteTimeEntryMutation = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseStartTimeEntryMutation = vi.fn();
const mockUseStopTimeEntryMutation = vi.fn();
const mockUseTimeEntriesQuery = vi.fn();
const mockUseTagsQuery = vi.fn();
const mockUseUpdateWebSessionMutation = vi.fn();
const mockUseUpdateTimeEntryMutation = vi.fn();

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
  useSessionActions: () => mockUseSessionActions(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => mockUseCurrentTimeEntryQuery(),
  useCreateTagMutation: () => mockUseCreateTagMutation(),
  useCreateProjectMutation: () => mockUseCreateProjectMutation(),
  useCreateTimeEntryMutation: () => mockUseCreateTimeEntryMutation(),
  useCreateWorkspaceFavoriteMutation: () => mockUseCreateWorkspaceFavoriteMutation(),
  useDeleteTimeEntryMutation: () => mockUseDeleteTimeEntryMutation(),
  useProjectsQuery: (...args: unknown[]) => mockUseProjectsQuery(...args),
  useStartTimeEntryMutation: () => mockUseStartTimeEntryMutation(),
  useStopTimeEntryMutation: () => mockUseStopTimeEntryMutation(),
  useTimeEntriesQuery: () => mockUseTimeEntriesQuery(),
  useTagsQuery: (...args: unknown[]) => mockUseTagsQuery(...args),
  useUpdateWebSessionMutation: () => mockUseUpdateWebSessionMutation(),
  useUpdateTimeEntryMutation: () => mockUseUpdateTimeEntryMutation(),
}));

describe("WorkspaceTimerPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
        beginningOfWeek: 1,
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
    mockUseCreateTagMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseCreateWorkspaceFavoriteMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseDeleteTimeEntryMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseCreateTimeEntryMutation.mockReturnValue({
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
    mockUseUpdateWebSessionMutation.mockReturnValue({
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

  it("opens timer suggestions when focusing the idle description without a draft project or tag", () => {
    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [
        createTimeEntryFixture({
          description: "Review PR",
          id: 451,
          project_id: 77,
          project_name: "OpenToggl",
        }),
      ],
      error: null,
      isError: false,
      isPending: false,
    });
    mockUseProjectsQuery.mockReturnValue({
      data: [
        {
          active: true,
          color: "#10b4ff",
          id: 77,
          name: "OpenToggl",
        },
      ],
    });

    render(<WorkspaceTimerPage />);

    fireEvent.focus(screen.getByLabelText("Time entry description"));

    const dialog = screen.getByTestId("timer-composer-suggestions-dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText("Previously tracked time entries")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Review PR/i })).toBeTruthy();
  });

  it("applies a previous entry suggestion to the idle timer draft and starts with its project and tags", async () => {
    const startTimeEntry = vi.fn();
    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [
        createTimeEntryFixture({
          description: "Deep work",
          id: 452,
          project_color: "#10b4ff",
          project_id: 88,
          project_name: "OpenToggl",
          tag_ids: [7, 8],
          tags: ["Focus", "Build"],
        }),
      ],
      error: null,
      isError: false,
      isPending: false,
    });
    mockUseProjectsQuery.mockReturnValue({
      data: [
        {
          active: true,
          color: "#10b4ff",
          id: 88,
          name: "OpenToggl",
        },
      ],
    });
    mockUseTagsQuery.mockReturnValue({
      data: [
        { id: 7, name: "Focus" },
        { id: 8, name: "Build" },
      ],
    });
    mockUseStartTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: startTimeEntry,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.focus(screen.getByLabelText("Time entry description"));
    fireEvent.click(
      within(screen.getByTestId("timer-composer-suggestions-dialog")).getByRole("button", {
        name: /Deep work/i,
      }),
    );

    expect(screen.getByDisplayValue("Deep work")).toBeTruthy();
    expect(screen.getAllByText("OpenToggl").length).toBeGreaterThan(0);
    expect(screen.getByText("Focus +1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

    await waitFor(() => {
      expect(startTimeEntry).toHaveBeenCalledWith({
        description: "Deep work",
        projectId: 88,
        start: expect.any(String),
        tagIds: [7, 8],
      });
    });
  });

  it("shows the selected week range in the toolbar and opens the week range dialog", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T09:00:00Z"));

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: /2026-03-23 - 2026-03-29/i }));

    expect(screen.getByTestId("week-range-dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "This week" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("March")).toBeTruthy();
    expect(screen.getByText("2026")).toBeTruthy();
  });

  it("changes the queried week when selecting last week from the dialog", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T09:00:00Z"));

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: /2026-03-23 - 2026-03-29/i }));
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));

    expect(screen.getByRole("button", { name: /2026-03-16 - 2026-03-22/i })).toBeTruthy();
    expect(screen.queryByTestId("week-range-dialog")).toBeNull();
  });

  it("keeps the timer header outside the scrollable content area", () => {
    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    const page = screen.getByTestId("tracking-timer-page");
    const scrollArea = screen.getByTestId("tracking-timer-scroll-area");
    const weekRangeButton = screen.getByRole("button", {
      name: /\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}/i,
    });

    expect(page.firstElementChild?.tagName).toBe("HEADER");
    expect(scrollArea.parentElement).toBe(page);
    expect(scrollArea.contains(weekRangeButton)).toBe(false);
  });

  it("renders the entry editor inside the timer scroll area so it scrolls with calendar content", () => {
    const today = new Date();
    const day = String(today.getUTCDate()).padStart(2, "0");
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const year = today.getUTCFullYear();
    const historicalEntry = createTimeEntryFixture({
      description: "Scroll with calendar",
      id: 777,
      start: `${year}-${month}-${day}T12:00:00Z`,
      stop: `${year}-${month}-${day}T12:30:00Z`,
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

    render(<WorkspaceTimerPage />);

    const scrollArea = screen.getByTestId("tracking-timer-scroll-area");
    fireEvent.click(screen.getByRole("button", { name: "Edit Scroll with calendar" }));

    const layer = screen.getByTestId("time-entry-editor-layer");
    expect(scrollArea.contains(layer)).toBe(true);
    expect(layer.className).toContain("absolute");
    expect(layer.className).not.toContain("fixed");
  });

  it("renders only current workspace entries in the calendar view", () => {
    const today = new Date();
    const day = String(today.getUTCDate()).padStart(2, "0");
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const year = today.getUTCFullYear();

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [
        createTimeEntryFixture({
          description: "Current workspace entry",
          id: 780,
          start: `${year}-${month}-${day}T09:00:00Z`,
          stop: `${year}-${month}-${day}T09:30:00Z`,
          workspace_id: 202,
          wid: 202,
        }),
        createTimeEntryFixture({
          description: "Other workspace entry",
          id: 781,
          start: `${year}-${month}-${day}T12:00:00Z`,
          stop: `${year}-${month}-${day}T12:30:00Z`,
          workspace_id: 303,
          wid: 303,
        }),
      ],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    expect(screen.getByRole("button", { name: "Edit Current workspace entry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit Other workspace entry" })).toBeNull();
  });

  it("keeps the edited start time visible in the editor before save", () => {
    const today = new Date();
    const day = String(today.getUTCDate()).padStart(2, "0");
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const year = today.getUTCFullYear();
    const historicalEntry = createTimeEntryFixture({
      description: "Edit time before save",
      id: 778,
      start: `${year}-${month}-${day}T10:00:00Z`,
      stop: `${year}-${month}-${day}T10:30:00Z`,
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

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Edit time before save" }));

    fireEvent.click(screen.getByRole("button", { name: "Edit start time" }));
    const timeInput = screen.getByLabelText("Edit time");
    fireEvent.change(timeInput, { target: { value: "15:28" } });
    fireEvent.blur(timeInput);

    expect(screen.getByRole("button", { name: "Edit start time" }).textContent).toContain("15:28");
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

  it("continues a stopped entry with its saved metadata", async () => {
    const startTimeEntry = vi.fn().mockResolvedValue({
      ...createTimeEntryFixture(),
      duration: -1,
      id: 555,
      stop: undefined,
    });
    const historicalEntry = createTimeEntryFixture({
      billable: true,
      description: "Continue me",
      id: 403,
      project_id: 44,
      start: "2026-03-23T10:00:00Z",
      stop: "2026-03-23T10:30:00Z",
      tag_ids: [7, 8],
      task_id: 55,
    });

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseStartTimeEntryMutation.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: startTimeEntry,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [historicalEntry],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Continue me" }));
    fireEvent.click(
      within(screen.getByTestId("time-entry-editor-dialog")).getByRole("button", {
        name: "Continue Time Entry",
      }),
    );

    await waitFor(() => {
      expect(startTimeEntry).toHaveBeenCalledWith({
        billable: true,
        description: "Continue me",
        projectId: 44,
        start: expect.any(String),
        tagIds: [7, 8],
        taskId: 55,
      });
    });
  });

  it("persists calendar drag move gestures through the update mutation", async () => {
    const updateTimeEntry = vi.fn().mockResolvedValue(createTimeEntryFixture());
    const historicalEntry = createTimeEntryFixture({
      description: "Drag me",
      id: 410,
      start: "2026-03-23T10:00:00Z",
      stop: "2026-03-23T10:30:00Z",
      tag_ids: [7, 8],
      task_id: 55,
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

    fireEvent.pointerDown(screen.getByTestId("calendar-entry-move-410"), { clientY: 100 });
    fireEvent.pointerUp(screen.getByTestId("calendar-entry-410"), { clientY: 130 });

    await waitFor(() => {
      expect(updateTimeEntry).toHaveBeenCalledWith({
        request: {
          billable: false,
          description: "Drag me",
          projectId: 44,
          start: "2026-03-23T10:30:00Z",
          stop: "2026-03-23T11:00:00Z",
          tagIds: [7, 8],
          taskId: 55,
        },
        timeEntryId: 410,
        workspaceId: 202,
      });
    });
  });

  it("persists calendar resize gestures through the update mutation", async () => {
    const updateTimeEntry = vi.fn().mockResolvedValue(createTimeEntryFixture());
    const historicalEntry = createTimeEntryFixture({
      description: "Resize me",
      id: 411,
      start: "2026-03-23T10:00:00Z",
      stop: "2026-03-23T10:30:00Z",
      tag_ids: [7],
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

    fireEvent.pointerDown(screen.getByTestId("calendar-entry-resize-start-411"), { clientY: 100 });
    fireEvent.pointerUp(screen.getByTestId("calendar-entry-411"), { clientY: 70 });

    await waitFor(() => {
      expect(updateTimeEntry).toHaveBeenCalledWith({
        request: {
          billable: false,
          description: "Resize me",
          projectId: 44,
          start: "2026-03-23T09:30:00Z",
          stop: "2026-03-23T10:30:00Z",
          tagIds: [7],
          taskId: null,
        },
        timeEntryId: 411,
        workspaceId: 202,
      });
    });
  });

  it("deletes a selected entry from the entry actions menu and closes the editor", async () => {
    const deleteTimeEntry = vi.fn().mockResolvedValue("deleted");
    const historicalEntry = createTimeEntryFixture({
      description: "Delete me",
      id: 401,
    });

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseDeleteTimeEntryMutation.mockReturnValue({
      isPending: false,
      mutateAsync: deleteTimeEntry,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [historicalEntry],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Delete me" }));
    fireEvent.click(
      within(screen.getByTestId("time-entry-editor-dialog")).getByRole("button", {
        name: "Entry actions",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => {
      expect(deleteTimeEntry).toHaveBeenCalledWith({
        timeEntryId: 401,
        workspaceId: 202,
      });
      expect(screen.queryByTestId("time-entry-editor-dialog")).toBeNull();
    });
  });

  it("duplicates a stopped entry from the editor and closes the dialog", async () => {
    const duplicateTimeEntry = vi.fn().mockResolvedValue({
      ...createTimeEntryFixture(),
      id: 999,
    });
    const historicalEntry = createTimeEntryFixture({
      billable: true,
      description: "Duplicate me",
      id: 402,
      project_id: 44,
      start: "2026-03-23T10:00:00Z",
      stop: "2026-03-23T10:30:00Z",
      tag_ids: [7, 8],
      task_id: 55,
    });

    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: null,
    });
    mockUseCreateTimeEntryMutation.mockReturnValue({
      isPending: false,
      mutateAsync: duplicateTimeEntry,
    });
    mockUseTimeEntriesQuery.mockReturnValue({
      data: [historicalEntry],
      error: null,
      isError: false,
      isPending: false,
    });

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Duplicate me" }));
    fireEvent.click(
      within(screen.getByTestId("time-entry-editor-dialog")).getByRole("button", {
        name: "Duplicate entry",
      }),
    );

    await waitFor(() => {
      expect(duplicateTimeEntry).toHaveBeenCalledWith({
        billable: true,
        description: "Duplicate me",
        duration: 1800,
        projectId: 44,
        start: "2026-03-23T10:00:00Z",
        stop: "2026-03-23T10:30:00Z",
        tagIds: [7, 8],
        taskId: 55,
      });
      expect(screen.queryByTestId("time-entry-editor-dialog")).toBeNull();
    });
  });

  it("does not show the duplicate button for a running entry", () => {
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

    render(<WorkspaceTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Current running timer" }));

    expect(
      within(screen.getByTestId("time-entry-editor-dialog")).queryByRole("button", {
        name: "Duplicate entry",
      }),
    ).toBeNull();
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
