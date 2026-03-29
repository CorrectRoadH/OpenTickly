import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceOverviewPage } from "./WorkspaceOverviewPage.tsx";

const mockUseSession = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseWorkspaceAllActivitiesQuery = vi.fn();
const mockUseWorkspaceMostActiveQuery = vi.fn();
const mockUseWorkspaceTopActivityQuery = vi.fn();

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
  useProjectsQuery: (...args: unknown[]) => mockUseProjectsQuery(...args),
  useWorkspaceAllActivitiesQuery: (...args: unknown[]) =>
    mockUseWorkspaceAllActivitiesQuery(...args),
  useWorkspaceMostActiveQuery: (...args: unknown[]) => mockUseWorkspaceMostActiveQuery(...args),
  useWorkspaceTopActivityQuery: (...args: unknown[]) => mockUseWorkspaceTopActivityQuery(...args),
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets the overview content use the page width instead of a fixed max width", () => {
    const markup = renderToStaticMarkup(<WorkspaceOverviewPage />);

    expect(markup).toContain('data-testid="workspace-overview-content"');
    expect(markup).toContain('class="relative z-10 flex w-full flex-col gap-5"');
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

    expect(markup).toContain(">15h<");
    expect(markup).toContain(">12h<");
    expect(markup).toContain(">9h<");
    expect(markup).toContain(">6h<");
    expect(markup).toContain(">3h<");
    expect(markup).toContain(">0h<");
    expect(markup).not.toContain(">10h 30<");
    expect(markup).toContain(
      'class="h-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-4 lg:min-h-[240px]"',
    );
  });
});
