/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ConnectedGoalsFavoritesSidebar } from "./ConnectedGoalsFavoritesSidebar.tsx";

const deleteFavorite = vi.fn();
const startFavorite = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("../../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({ isGoalsViewShown: true }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useDeleteFavoriteMutation: () => ({ mutateAsync: deleteFavorite }),
  useFavoritesQuery: () => ({ data: [{ favorite_id: 7 }] }),
  useGoalsQuery: () => ({ data: [] }),
  useStartTimeEntryMutation: () => ({ mutateAsync: startFavorite }),
}));

vi.mock("./GoalsFavoritesSidebar.tsx", () => ({
  GoalsFavoritesSidebar: ({
    onDeleteFavorite,
    onStartFavorite,
  }: {
    onDeleteFavorite: (id: number) => void;
    onStartFavorite: (favorite: { description: string; favorite_id: number }) => void;
  }) => (
    <>
      <button onClick={() => onStartFavorite({ description: "Focus", favorite_id: 7 })}>
        start favorite
      </button>
      <button onClick={() => onDeleteFavorite(7)}>delete favorite</button>
    </>
  ),
}));

describe("ConnectedGoalsFavoritesSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reports failed favorite actions", async () => {
    startFavorite.mockRejectedValue(new Error("start failed"));
    deleteFavorite.mockRejectedValue(new Error("delete failed"));
    render(<ConnectedGoalsFavoritesSidebar workspaceId={10} />);

    fireEvent.click(screen.getByRole("button", { name: "start favorite" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("failedToSaveTimeEntry"));

    fireEvent.click(screen.getByRole("button", { name: "delete favorite" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("unexpectedError"));
  });
});
