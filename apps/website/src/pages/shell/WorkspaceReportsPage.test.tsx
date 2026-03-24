import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceReportsPage } from "./WorkspaceReportsPage.tsx";

vi.mock("../../shared/query/web-shell.ts", () => ({
  useWorkspaceWeeklyReportQuery: () => ({
    data: [],
    isError: false,
    isPending: false,
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
  it("uses the shared shell typography and card geometry", () => {
    const markup = renderToStaticMarkup(<WorkspaceReportsPage />);

    expect(markup).toContain('data-testid="reports-page"');
    expect(markup).toContain("text-[21px] font-semibold leading-[30px]");
    expect(markup).toContain(
      "rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]",
    );
    expect(markup).toContain("This week . W");
    expect(markup).not.toContain("text-[22px]");
    expect(markup).not.toContain("rounded-[14px]");
  });
});
