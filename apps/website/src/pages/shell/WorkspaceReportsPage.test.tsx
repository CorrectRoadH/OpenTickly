import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceReportsPage } from "./WorkspaceReportsPage.tsx";

vi.mock("../../shared/query/web-shell.ts", () => ({
  useProjectsQuery: () => ({ data: [] }),
  useTagsQuery: () => ({ data: [] }),
  useWorkspaceWeeklyReportQuery: () => ({
    data: [],
    isError: false,
    isPending: false,
  }),
}));

vi.mock("../../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({
    durationFormat: "improved",
    timeofdayFormat: "HH:mm",
    beginningOfWeek: 1,
    collapseTimeEntries: true,
  }),
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({
    currentWorkspace: {
      id: 1,
    },
    user: {
      beginningOfWeek: 1,
      timezone: "UTC",
    },
  }),
}));

describe("WorkspaceReportsPage", () => {
  it("uses the shared workspace typography and card geometry", () => {
    const markup = renderToStaticMarkup(<WorkspaceReportsPage tab="summary" />);

    expect(markup).toContain('data-testid="reports-page"');
    expect(markup).toContain("text-[21px] font-semibold leading-[30px]");
    expect(markup).toContain(
      "rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]",
    );
    expect(markup).toContain("This week . W");
    expect(markup).not.toContain("text-[22px]");
    expect(markup).not.toContain("rounded-[14px]");
  });

  it("renders prev/next navigation buttons with click handlers", () => {
    const markup = renderToStaticMarkup(<WorkspaceReportsPage tab="summary" />);

    expect(markup).toContain('data-testid="reports-prev"');
    expect(markup).toContain('data-testid="reports-next"');
    expect(markup).toContain('data-testid="reports-range-label"');
  });

  it("renders project and tag filter dropdowns", () => {
    const markup = renderToStaticMarkup(<WorkspaceReportsPage tab="summary" />);

    expect(markup).toContain('data-testid="reports-filter-project"');
    expect(markup).toContain('data-testid="reports-filter-tag"');
  });

  it("renders breakdown expand buttons with test ids", () => {
    const markup = renderToStaticMarkup(<WorkspaceReportsPage tab="summary" />);

    expect(markup).toContain('data-testid="reports-breakdown-table"');
    expect(markup).toContain("No tracked time for this period yet.");
  });
});
