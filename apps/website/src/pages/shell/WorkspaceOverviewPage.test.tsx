import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceOverviewPage } from "./WorkspaceOverviewPage.tsx";

const mockInviteWorkspaceMemberMutation = vi.fn();
const mockUseSession = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseWorkspaceAllActivitiesQuery = vi.fn();
const mockUseWorkspaceMembersQuery = vi.fn();
const mockUseWorkspaceMostActiveQuery = vi.fn();
const mockUseWorkspaceTopActivityQuery = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({
    durationFormat: "improved",
    timeofdayFormat: "HH:mm",
    beginningOfWeek: 1,
    collapseTimeEntries: true,
  }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useInviteWorkspaceMemberMutation: (...args: unknown[]) =>
    mockInviteWorkspaceMemberMutation(...args),
  useProjectsQuery: (...args: unknown[]) => mockUseProjectsQuery(...args),
  useWorkspaceAllActivitiesQuery: (...args: unknown[]) =>
    mockUseWorkspaceAllActivitiesQuery(...args),
  useWorkspaceMembersQuery: (...args: unknown[]) => mockUseWorkspaceMembersQuery(...args),
  useWorkspaceMostActiveQuery: (...args: unknown[]) => mockUseWorkspaceMostActiveQuery(...args),
  useWorkspaceTopActivityQuery: (...args: unknown[]) => mockUseWorkspaceTopActivityQuery(...args),
}));

vi.mock("./OnboardingChecklist.tsx", () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
}));

vi.mock("./OverviewWeekChart.tsx", () => ({
  OverviewWeekChart: ({ axisLabels }: { axisLabels: string[] }) => (
    <div data-testid="overview-week-chart">{axisLabels.join("|")}</div>
  ),
}));

describe("WorkspaceOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));

    mockUseSession.mockReturnValue({
      currentOrganization: {
        id: 9,
        userCount: 4,
      },
      currentWorkspace: {
        id: 202,
        name: "North Ridge Delivery",
      },
      user: {
        timezone: "UTC",
      },
    });

    mockUseProjectsQuery.mockReturnValue({
      data: [],
    });
    mockUseWorkspaceAllActivitiesQuery.mockReturnValue({
      data: [],
    });
    mockUseWorkspaceMostActiveQuery.mockReturnValue({
      data: [],
    });
    mockUseWorkspaceTopActivityQuery.mockReturnValue({
      data: [],
    });
    mockUseWorkspaceMembersQuery.mockReturnValue({
      data: { members: [] },
    });
    mockInviteWorkspaceMemberMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets the overview content use the page width instead of a fixed max width", () => {
    const markup = renderToStaticMarkup(<WorkspaceOverviewPage />);

    expect(markup).toContain('data-testid="workspace-overview-content"');
    expect(markup).not.toContain("max-w-[654px]");
  });

  it("uses flexible desktop columns instead of fixed 430/214 pixel tracks", () => {
    const markup = renderToStaticMarkup(<WorkspaceOverviewPage />);

    expect(markup).toContain('data-testid="workspace-overview-grid"');
    expect(markup).toContain("lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]");
    expect(markup).toContain("xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]");
    expect(markup).not.toContain("lg:grid-cols-[minmax(0,430px)_214px]");
  });

  it("rounds weekly summary axis labels to 30-minute steps", () => {
    mockUseWorkspaceAllActivitiesQuery.mockReturnValue({
      data: [
        {
          duration: 45600,
          stop: "2026-03-23T12:40:14Z",
        },
      ],
    });

    const markup = renderToStaticMarkup(<WorkspaceOverviewPage />);

    expect(markup).toContain("15h|12h|9h|6h|3h|0h");
    expect(markup).not.toContain("10h 30");
    expect(markup).toContain("h-full px-5 py-5");
    expect(markup).toContain("lg:min-h-[240px]");
  });
});
