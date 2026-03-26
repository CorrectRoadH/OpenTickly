/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPage } from "./ProjectsPage.tsx";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseCreateProjectMutation = vi.fn();
const mockUseDeleteProjectMutation = vi.fn();
const mockUseAddProjectMemberMutation = vi.fn();
const mockUseArchiveProjectMutation = vi.fn();
const mockUseRestoreProjectMutation = vi.fn();
const mockUsePinProjectMutation = vi.fn();
const mockUseUnpinProjectMutation = vi.fn();
const mockUseUpdateProjectMutation = vi.fn();
const mockUseWorkspaceUsersQuery = vi.fn();
const mockUseProjectMembersQuery = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useProjectsQuery: () => mockUseProjectsQuery(),
  useWorkspaceUsersQuery: () => mockUseWorkspaceUsersQuery(),
  useCreateProjectMutation: () => mockUseCreateProjectMutation(),
  useUpdateProjectMutation: () => mockUseUpdateProjectMutation(),
  useArchiveProjectMutation: () => mockUseArchiveProjectMutation(),
  useRestoreProjectMutation: () => mockUseRestoreProjectMutation(),
  usePinProjectMutation: () => mockUsePinProjectMutation(),
  useUnpinProjectMutation: () => mockUseUnpinProjectMutation(),
  useAddProjectMemberMutation: () => mockUseAddProjectMemberMutation(),
  useDeleteProjectMutation: () => mockUseDeleteProjectMutation(),
  useProjectMembersQuery: () => mockUseProjectMembersQuery(),
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
    mockUseWorkspaceUsersQuery.mockReturnValue({
      data: [
        { email: "alex@example.com", fullname: "Alex", id: 900 },
        { email: "jamie@example.com", fullname: "Jamie", id: 901 },
      ],
    });
    mockUseProjectMembersQuery.mockReturnValue({
      data: [],
    });
    mockUseCreateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({
        color: "#2da1ff",
        id: 701,
        name: "Launchpad",
      }),
    });
    mockUseUpdateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
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
    mockUseAddProjectMemberMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseDeleteProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("creates a private project from the dialog with members and advanced options", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      color: "#2da1ff",
      id: 701,
      name: "Launchpad",
    });
    const addMember = vi.fn().mockResolvedValue({});
    mockUseCreateProjectMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });
    mockUseAddProjectMemberMutation.mockReturnValue({
      isPending: false,
      mutateAsync: addMember,
    });

    render(<ProjectsPage statusFilter="all" />);

    fireEvent.click(screen.getByTestId("projects-create-button"));

    expect(screen.getByRole("dialog", { name: "Create new project" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Launchpad" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Private, visible only to project members" }),
    );
    fireEvent.change(screen.getByLabelText("Invite members"), {
      target: { value: "alex" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Alex/i }));
    fireEvent.click(screen.getByRole("button", { name: "Advanced options" }));
    fireEvent.click(screen.getByRole("button", { name: "Select color #2da1ff" }));
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        color: "#2da1ff",
        isPrivate: true,
        name: "Launchpad",
        template: false,
      });
      expect(addMember).toHaveBeenCalledWith({
        isManager: false,
        projectId: 701,
        userId: 900,
      });
    });
  });
});
