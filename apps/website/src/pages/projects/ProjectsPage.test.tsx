import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPage } from "./ProjectsPage.tsx";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseCreateProjectMutation = vi.fn();
const mockUseArchiveProjectMutation = vi.fn();
const mockUseRestoreProjectMutation = vi.fn();
const mockUsePinProjectMutation = vi.fn();
const mockUseUnpinProjectMutation = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useProjectsQuery: () => mockUseProjectsQuery(),
  useCreateProjectMutation: () => mockUseCreateProjectMutation(),
  useArchiveProjectMutation: () => mockUseArchiveProjectMutation(),
  useRestoreProjectMutation: () => mockUseRestoreProjectMutation(),
  usePinProjectMutation: () => mockUsePinProjectMutation(),
  useUnpinProjectMutation: () => mockUseUnpinProjectMutation(),
}));

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSession.mockReturnValue({
      currentWorkspace: {
        id: 202,
      },
    });
    mockUseProjectsQuery.mockReturnValue({
      data: [],
      isError: false,
      isPending: false,
    });
    mockUseCreateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({
        color: "#2da1ff",
        id: 701,
        name: "Launchpad",
      }),
    });
    mockUseArchiveProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseRestoreProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUsePinProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseUnpinProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it("creates a project from the dialog with the selected color", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      color: "#2da1ff",
      id: 701,
      name: "Launchpad",
    });
    mockUseCreateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<ProjectsPage statusFilter="all" />);

    fireEvent.click(screen.getByTestId("projects-create-button"));

    expect(screen.getByRole("dialog", { name: "Create new project" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Launchpad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select color #2da1ff" }));
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      color: "#2da1ff",
      name: "Launchpad",
    });
  });
});
