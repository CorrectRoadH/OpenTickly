/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDetailPage } from "./ProjectDetailPage.tsx";

const mockUseSession = vi.fn();
const mockUseProjectDetailQuery = vi.fn();
const mockUseProjectMembersQuery = vi.fn();
const mockUseProjectStatisticsQuery = vi.fn();
const mockUseWorkspaceMembersQuery = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useProjectDetailQuery: (...args: unknown[]) => mockUseProjectDetailQuery(...args),
  useProjectMembersQuery: (...args: unknown[]) => mockUseProjectMembersQuery(...args),
  useProjectStatisticsQuery: (...args: unknown[]) => mockUseProjectStatisticsQuery(...args),
  useWorkspaceMembersQuery: (...args: unknown[]) => mockUseWorkspaceMembersQuery(...args),
}));

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSession.mockReturnValue({
      currentWorkspace: {
        id: 2,
        isPremium: true,
      },
      user: {
        fullName: "CtrdH",
      },
    });
    mockUseProjectDetailQuery.mockReturnValue({
      data: {
        actual_seconds: 20160,
        billable: false,
        id: 5,
        is_private: false,
        name: "toggl CLI",
      },
      isError: false,
      isPending: false,
    });
    mockUseProjectMembersQuery.mockReturnValue({
      data: [
        {
          manager: true,
          project_id: 5,
          user_id: 99,
        },
      ],
      isPending: false,
    });
    mockUseProjectStatisticsQuery.mockReturnValue({
      data: {
        earliest_time_entry: "2026-03-01T02:00:00Z",
        latest_time_entry: "2026-03-06T09:36:00Z",
      },
    });
    mockUseWorkspaceMembersQuery.mockReturnValue({
      data: {
        members: [],
      },
    });
  });

  it("renders the canonical project team view", () => {
    render(<ProjectDetailPage projectId={5} workspaceId={2} />);

    expect(screen.getByText("toggl CLI")).toBeTruthy();
    expect(screen.getByText("5:36:00")).toBeTruthy();
    expect(screen.getByText("0:00:00")).toBeTruthy();
    expect(screen.getByText("CtrdH")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
  });
});
