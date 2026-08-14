/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MobileTimerPage } from "./MobileTimerPage.tsx";

const start = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("../../features/tracking/overview-data.ts", () => ({
  formatClockDuration: vi.fn(),
  formatGroupLabel: vi.fn(),
}));

vi.mock("../../features/tracking/GoalsFavoritesSidebar.tsx", () => ({
  GoalItem: () => null,
}));

vi.mock("../../features/tracking/useWorkspaceData.ts", () => ({
  useWorkspaceData: () => ({ timezone: "UTC", workspaceId: 10 }),
}));

vi.mock("../../features/tracking/useTimerComposer.ts", () => ({
  useTimerComposer: () => ({ handleContinueEntry: vi.fn() }),
}));

vi.mock("../../features/tracking/useTimeEntryViews.ts", () => ({
  useTimeEntryViews: () => ({
    groupedEntries: [],
    recentWorkspaceEntries: [],
    timeEntriesQuery: { data: [], isPending: false, isSuccess: true },
  }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useFavoritesQuery: () => ({
    data: [{ description: "Favorite work", favorite_id: 1 }],
  }),
  useGoalsQuery: () => ({ data: [] }),
  useStartTimeEntryMutation: () => ({ isPending: false, mutateAsync: start }),
}));

vi.mock("./MobileTimeEntryEditor.tsx", () => ({ MobileTimeEntryEditor: () => null }));
vi.mock("./MobileTimeEntryRow.tsx", () => ({ MobileTimeEntryRow: () => null }));

describe("MobileTimerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reports a failed favorite start", async () => {
    start.mockRejectedValue(new Error("start failed"));
    render(<MobileTimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "startFavorite" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("failedToSaveTimeEntry"));
  });
});
